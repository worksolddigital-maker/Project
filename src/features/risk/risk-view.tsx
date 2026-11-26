"use client";

import { Activity, Flame, Gauge, Layers, Percent, Scale, ShieldCheck, TrendingDown, Waves } from "lucide-react";
import { useMemo } from "react";
import { DrawdownChart, type DrawdownDatum } from "@/components/charts/charts";
import { ALERT_STYLE } from "@/components/layout/alerts-bell";
import { DataGate, PageHeader } from "@/components/layout/page";
import { RevealGroup } from "@/components/motion/reveal";
import { Panel, ProgressBar } from "@/components/ui/misc";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { SettingsFieldsForm } from "@/features/settings/settings-fields";
import { useReadyData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import { dayKeyOf, formatDateTime, formatDayKey } from "@/lib/domain/dates";
import { formatMoney, formatNumber, formatPct } from "@/lib/domain/money";
import { behaviorStats } from "@/lib/domain/risk";

function Meter({ label, current, limit, format, unit }: { label: string; current: number; limit: number | null; format: (v: number) => string; unit?: string }) {
  const pct = limit && limit > 0 ? (current / limit) * 100 : 0;
  const tone = !limit ? "neutral" : pct >= 100 ? "neg" : pct >= 80 ? "warn" : "pos";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="num text-fg">
          {format(current)}
          {limit ? <span className="text-subtle"> / {format(limit)}</span> : <span className="text-subtle"> · sem limite</span>}
          {unit}
        </span>
      </div>
      <ProgressBar value={pct} tone={tone} label={label} />
    </div>
  );
}

function RiskContent() {
  const { portfolio: p, settings, risk: m, alerts } = useReadyData();
  const cur = settings.currency;
  const money = (v: number) => formatMoney(Math.round(v), cur);
  const behavior = useMemo(() => behaviorStats(p.sortedTrades, p.tz, settings, (t) => dayKeyOf(t.executedAt, p.tz)), [p, settings]);

  const ddSeries = useMemo<DrawdownDatum[]>(() => {
    const pts = p.ledger.points;
    const step = Math.max(1, Math.ceil(pts.length / 400));
    return pts
      .filter((_, i) => i % step === 0 || i === pts.length - 1)
      .map((pt) => ({
        label: pt.dayKey ? formatDayKey(pt.dayKey, "dayMonth") : "Início",
        detail: pt.at ? formatDateTime(pt.at, p.tz) : "Início",
        pct: -pt.drawdownPct,
        cents: pt.drawdownCents,
      }));
  }, [p]);

  const riskAlerts = alerts.filter((a) => a.level === "danger" || a.level === "warning");

  return (
    <>
      <PageHeader
        title="Gestão de risco"
        description="Indicadores de exposição e comportamento comparados aos limites que você definiu. O sistema não recomenda operações."
      />

      <section
        className={cn(
          "glass mb-4 rounded-2xl border p-4 sm:p-5",
          riskAlerts.some((a) => a.level === "danger") ? "border-neg/30" : riskAlerts.length ? "border-warn/30" : "border-pos/20",
        )}
        data-testid="risk-status"
      >
        {riskAlerts.length === 0 ? (
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-pos/25 bg-pos/10 text-pos">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Dentro dos parâmetros</p>
              <p className="text-xs text-muted">Nenhum limite de risco foi atingido hoje.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {riskAlerts.map((a) => {
              const st = ALERT_STYLE[a.level];
              const Icon = st.icon;
              return (
                <div key={a.id} className={cn("flex gap-3 rounded-xl border p-3", st.ring, st.bg)} data-testid="risk-alert">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", st.text)} />
                  <div>
                    <p className="text-[13px] font-medium">{a.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{a.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <StatGrid>
        <StatCard
          label="Risco por operação (média)"
          value={m.avgRiskPerTradePct}
          format={(v) => formatPct(v, { digits: 2 })}
          tone={settings.riskPerTradePct && m.avgRiskPerTradePct && m.avgRiskPerTradePct > settings.riskPerTradePct ? "warn" : "neutral"}
          icon={<Percent className="size-4" />}
          sub={m.lastRiskPerTradePct !== null ? `Última operação: ${formatPct(m.lastRiskPerTradePct, { digits: 2 })}` : "Valor ÷ saldo antes da operação"}
        />
        <StatCard label="Exposição diária" value={m.dailyExposureCents} format={money} icon={<Layers className="size-4" />} sub="Total investido hoje" testId="risk-exposure" />
        <StatCard
          label="Capital comprometido"
          value={m.capitalCommittedPct}
          format={(v) => formatPct(v, { digits: 2 })}
          tone={settings.maxDailyExposurePct && m.capitalCommittedPct && m.capitalCommittedPct > settings.maxDailyExposurePct ? "warn" : "neutral"}
          icon={<Gauge className="size-4" />}
          sub="Exposição ÷ saldo no início do dia"
        />
        <StatCard
          label="Drawdown máximo"
          value={m.maxDrawdownCents}
          format={(v) => (v > 0 ? `−${money(v)}` : money(v))}
          tone={m.maxDrawdownCents > 0 ? "neg" : "neutral"}
          icon={<TrendingDown className="size-4" />}
          sub={`${formatPct(m.maxDrawdownPct, { digits: 2 })} · atual ${formatPct(m.currentDrawdownPct, { digits: 2 })}`}
          testId="risk-max-dd"
        />
        <StatCard
          label="Sequência de perdas"
          value={m.todayLossStreak}
          format={(v) => `${Math.round(v)} hoje`}
          tone={settings.maxConsecutiveLosses && m.todayLossStreak >= settings.maxConsecutiveLosses ? "neg" : "neutral"}
          icon={<Flame className="size-4" />}
          sub={`Atual geral: ${m.currentLossStreak} · máxima: ${m.maxLossStreak}`}
        />
        <StatCard
          label="Relação lucro / prejuízo"
          value={m.payoffRatio}
          format={(v) => `${v.toFixed(2).replace(".", ",")}x`}
          icon={<Scale className="size-4" />}
          sub="Lucro médio (WIN) ÷ perda média (LOSS)"
        />
        <StatCard
          label="Fator de lucro"
          value={m.profitFactor}
          format={(v) => v.toFixed(2).replace(".", ",")}
          tone={m.profitFactor === null ? "neutral" : m.profitFactor >= 1 ? "pos" : "neg"}
          icon={<Activity className="size-4" />}
          sub="Lucro bruto ÷ prejuízo bruto"
        />
        <StatCard
          label="Limite de perda diário"
          value={m.dailyLossUsedPct}
          format={(v) => `${formatPct(v)} usado`}
          tone={m.dailyLossUsedPct === null ? "neutral" : m.dailyLossUsedPct >= 100 ? "neg" : m.dailyLossUsedPct >= 80 ? "warn" : "neutral"}
          icon={<Waves className="size-4" />}
          sub={settings.dailyLossLimitCents ? `Limite: ${money(settings.dailyLossLimitCents)} · hoje ${formatMoney(m.todayNetCents, cur, { signed: true })}` : "Defina o limite abaixo"}
          testId="risk-loss-used"
        />
      </StatGrid>

      <RevealGroup className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel data-reveal className="xl:col-span-2" title="Drawdown (curva submersa)" subtitle="Queda percentual a partir do pico de resultado acumulado">
          <DrawdownChart data={ddSeries} currency={cur} />
        </Panel>
        <Panel data-reveal title="Limites de hoje" subtitle="Consumo dos seus parâmetros">
          <div className="space-y-5">
            <Meter label="Perda do dia" current={Math.max(0, -m.todayNetCents)} limit={settings.dailyLossLimitCents} format={money} />
            <Meter label="Operações" current={p.todayStats.count} limit={settings.maxTradesPerDay} format={(v) => String(v)} />
            <Meter label="Perdas consecutivas" current={m.todayLossStreak} limit={settings.maxConsecutiveLosses} format={(v) => String(v)} />
            <Meter label="Exposição do dia" current={m.capitalCommittedPct ?? 0} limit={settings.maxDailyExposurePct} format={(v) => formatPct(v)} />
            <Meter label="Drawdown atual" current={m.currentDrawdownPct} limit={settings.maxDrawdownPct} format={(v) => formatPct(v)} />
          </div>
        </Panel>

        <Panel data-reveal title="Comportamentos de risco" subtitle={`Histórico de ${behavior.tradingDays} dia(s) operados`}>
          <ul className="divide-y divide-line text-sm">
            {[
              { label: "Aumentos de valor logo após um LOSS", value: behavior.stakeRaisesAfterLoss, hint: "Possível tentativa de recuperação" },
              { label: "Operações após atingir o limite diário", value: behavior.tradesAfterLossLimit, hint: settings.dailyLossLimitCents ? `${behavior.daysLossLimitBreached} dia(s) com limite atingido` : "Limite diário não definido" },
              { label: "Dias acima do máximo de operações", value: behavior.daysOverMaxTrades, hint: settings.maxTradesPerDay ? `Máximo: ${settings.maxTradesPerDay}/dia` : "Máximo não definido" },
              { label: "Dias que continuaram após a sequência limite de perdas", value: behavior.daysContinuedAfterLossStreak, hint: settings.maxConsecutiveLosses ? `Limite: ${settings.maxConsecutiveLosses} perdas` : "Limite não definido" },
            ].map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-[13px] text-fg">{r.label}</p>
                  <p className="text-xs text-subtle">{r.hint}</p>
                </div>
                <span className={cn("num text-lg font-semibold", r.value > 0 ? "text-warn" : "text-muted")}>{formatNumber(r.value)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel data-reveal className="xl:col-span-2" title="Parâmetros de risco" subtitle="Deixe em branco para desativar. Alterações recalculam os alertas imediatamente.">
          <SettingsFieldsForm
            testId="risk-settings"
            columns={3}
            keys={["maxStakeCents", "riskPerTradePct", "dailyLossLimitCents", "maxConsecutiveLosses", "maxTradesPerDay", "maxDrawdownPct", "maxDailyExposurePct"]}
          />
        </Panel>
      </RevealGroup>
    </>
  );
}

export function RiskView() {
  return (
    <DataGate>
      <RiskContent />
    </DataGate>
  );
}
