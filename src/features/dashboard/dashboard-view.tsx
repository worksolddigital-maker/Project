"use client";

import {
  ArrowRight,
  Award,
  Banknote,
  CandlestickChart,
  Crosshair,
  Flame,
  Percent,
  Scale,
  TrendingDown,
  TrendingUp,
  Trophy,
  Upload,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { EquityChart, PnlBarChart, WinLossDonut } from "@/components/charts/charts";
import { ALERT_STYLE } from "@/components/layout/alerts-bell";
import { DataGate, PageHeader } from "@/components/layout/page";
import { RevealGroup } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/misc";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { dailySeries, equitySeries, lastNDaysRange } from "@/features/analytics/series";
import { MarketWidget } from "@/features/market/market-widget";
import { MoneyText, TradeRow } from "@/features/trades/trade-bits";
import { useTradeModal } from "@/features/trades/trade-modal-context";
import { useReadyData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import { filterByRange } from "@/lib/domain/analytics";
import { formatDateTime } from "@/lib/domain/dates";
import { formatMoney, formatNumber, formatPct } from "@/lib/domain/money";

function Onboarding({ hasCapital, hasTrades }: { hasCapital: boolean; hasTrades: boolean }) {
  const { openNew } = useTradeModal();
  const steps = [
    { done: hasCapital, title: "Defina seu capital inicial", text: "Base para saldo, rentabilidade e risco.", action: <Link href="/banca" className="text-xs font-medium text-fg hover:underline">Gerenciamento de banca →</Link> },
    { done: hasTrades, title: "Registre sua primeira operação", text: "Os indicadores se atualizam na hora.", action: <button type="button" onClick={() => openNew()} className="text-xs font-medium text-fg hover:underline">Nova operação →</button> },
    { done: hasTrades, title: "Ou importe seu histórico", text: "CSV ou Excel exportado da corretora.", action: <Link href="/operacoes?importar=1" className="text-xs font-medium text-fg hover:underline">Importar histórico →</Link> },
  ];
  return (
    <section className="glass mb-6 overflow-hidden rounded-2xl">
      <div className="grid gap-px bg-line md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="bg-[#0a0c10]/90 p-5">
            <div className="flex items-center gap-2.5">
              <span className={cn("grid size-6 place-items-center rounded-full border text-[11px] font-semibold", s.done ? "border-pos/40 bg-pos/15 text-pos" : "border-line-strong text-muted")}>
                {s.done ? "✓" : i + 1}
              </span>
              <p className={cn("text-sm font-medium", s.done ? "text-muted line-through decoration-subtle" : "text-fg")}>{s.title}</p>
            </div>
            <p className="mt-2 text-xs text-muted">{s.text}</p>
            {!s.done && <div className="mt-3">{s.action}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardContent() {
  const { portfolio: p, settings, alerts, strategyName } = useReadyData();
  const { openNew, openEdit } = useTradeModal();
  const cur = settings.currency;
  const s = p.summary;
  const money = (v: number) => formatMoney(Math.round(v), cur);
  const signedMoney = (v: number) => formatMoney(Math.round(v), cur, { signed: true });

  const equity = useMemo(() => equitySeries(p), [p]);
  const daily = useMemo(() => {
    const range = lastNDaysRange(p.today, 30);
    return dailySeries(filterByRange(p.sortedTrades, range, p.tz), p, range);
  }, [p]);
  const recent = p.sortedTrades.slice(-8).reverse();
  const hasTrades = s.count > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão consolidada da conta. Todos os indicadores são recalculados a cada operação registrada."
        actions={
          <>
            <Link href="/operacoes?importar=1">
              <Button variant="secondary" icon={<Upload className="size-4" />}>
                Importar
              </Button>
            </Link>
          </>
        }
      />

      {(!hasTrades || p.initialCapitalCents === 0) && <Onboarding hasCapital={p.initialCapitalCents > 0 || p.depositsCents > 0} hasTrades={hasTrades} />}

      <StatGrid>
        <StatCard emphasis testId="kpi-balance" label="Saldo total da conta" value={p.balanceCents} format={money} icon={<Wallet className="size-4" />} sub={<>Capital aportado {formatMoney(p.contributedCents, cur)}</>} />
        <StatCard
          emphasis
          testId="kpi-net"
          label="Resultado líquido"
          value={p.netCents}
          format={signedMoney}
          tone={p.netCents > 0 ? "pos" : p.netCents < 0 ? "neg" : "neutral"}
          icon={<Scale className="size-4" />}
          sub={<>Hoje <MoneyText cents={p.todayStats.netCents} currency={cur} /></>}
        />
        <StatCard
          emphasis
          testId="kpi-return"
          label="Rentabilidade"
          value={p.returnPct}
          format={(v) => formatPct(v, { signed: true, digits: 2 })}
          tone={p.returnPct === null ? "neutral" : p.returnPct > 0 ? "pos" : p.returnPct < 0 ? "neg" : "neutral"}
          icon={<Percent className="size-4" />}
          sub="Resultado ÷ (capital inicial + depósitos)"
        />
        <StatCard
          emphasis
          testId="kpi-winrate"
          label="Taxa de acerto"
          value={s.winRate}
          format={(v) => formatPct(v)}
          icon={<Crosshair className="size-4" />}
          sub={s.draws ? `${s.draws} empate(s) não contam` : "WIN ÷ (WIN + LOSS)"}
        />
      </StatGrid>

      <StatGrid className="mt-3 sm:mt-4 lg:grid-cols-5">
        <StatCard label="Capital inicial" value={p.initialCapitalCents} format={money} icon={<Banknote className="size-4" />} testId="kpi-initial" />
        <StatCard label="Lucro acumulado" value={s.grossProfitCents} format={money} tone={s.grossProfitCents > 0 ? "pos" : "neutral"} icon={<TrendingUp className="size-4" />} testId="kpi-gross-profit" />
        <StatCard label="Prejuízo acumulado" value={s.grossLossCents} format={(v) => (v > 0 ? `−${money(v)}` : money(v))} tone={s.grossLossCents > 0 ? "neg" : "neutral"} icon={<TrendingDown className="size-4" />} testId="kpi-gross-loss" />
        <StatCard label="Total de operações" value={s.count} format={(v) => formatNumber(Math.round(v))} icon={<CandlestickChart className="size-4" />} testId="kpi-count" />
        <StatCard
          label="Operações vencedoras"
          value={s.wins}
          format={(v) => formatNumber(Math.round(v))}
          tone={s.wins ? "pos" : "neutral"}
          icon={<Flame className="size-4" />}
          testId="kpi-wins"
          sub={s.count ? `${formatPct((s.wins / s.count) * 100)} do total` : undefined}
        />
        <StatCard
          label="Operações perdedoras"
          value={s.losses}
          format={(v) => formatNumber(Math.round(v))}
          tone={s.losses ? "neg" : "neutral"}
          icon={<TrendingDown className="size-4" />}
          testId="kpi-losses"
          sub={s.count ? `${formatPct((s.losses / s.count) * 100)} do total` : undefined}
        />
        <StatCard label="Média de lucro por operação" value={s.avgWinCents} format={money} tone={s.avgWinCents ? "pos" : "neutral"} sub="Média das operações WIN" testId="kpi-avg-win" />
        <StatCard label="Média de perda por operação" value={s.avgLossCents} format={(v) => `−${money(v)}`} tone={s.avgLossCents ? "neg" : "neutral"} sub="Média das operações LOSS" testId="kpi-avg-loss" />
        <StatCard
          label="Melhor operação"
          value={s.best?.profitCents ?? null}
          format={signedMoney}
          tone="pos"
          icon={<Trophy className="size-4" />}
          sub={s.best ? `${s.best.asset} · ${formatDateTime(s.best.executedAt, p.tz)}` : undefined}
          testId="kpi-best"
        />
        <StatCard
          label="Pior operação"
          value={s.worst?.profitCents ?? null}
          format={signedMoney}
          tone={s.worst && s.worst.profitCents < 0 ? "neg" : "neutral"}
          icon={<Award className="size-4" />}
          sub={s.worst ? `${s.worst.asset} · ${formatDateTime(s.worst.executedAt, p.tz)}` : undefined}
          testId="kpi-worst"
        />
      </StatGrid>

      <RevealGroup className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel data-reveal className="xl:col-span-2" title="Evolução do saldo" subtitle="Inclui operações, depósitos e retiradas">
          <EquityChart data={equity} currency={cur} />
        </Panel>
        <Panel data-reveal title="Distribuição de resultados" subtitle={`${s.count} operações no total`}>
          <WinLossDonut wins={s.wins} losses={s.losses} draws={s.draws} />
        </Panel>
        <Panel data-reveal className="xl:col-span-2" title="Lucro e prejuízo diário" subtitle="Últimos 30 dias">
          <PnlBarChart data={daily} currency={cur} emptyMessage="Nenhuma operação nos últimos 30 dias." />
        </Panel>
        <Panel
          data-reveal
          title="Alertas ativos"
          subtitle="Com base nos seus parâmetros"
          actions={
            <Link href="/risco" className="text-xs text-muted hover:text-fg">
              Ver risco <ArrowRight className="inline size-3" />
            </Link>
          }
        >
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhum alerta no momento.
              <br />
              <Link href="/banca" className="text-xs text-fg hover:underline">
                Configure seus limites de risco e metas
              </Link>
            </p>
          ) : (
            <ul className="space-y-2" data-testid="dashboard-alerts">
              {alerts.slice(0, 5).map((a) => {
                const st = ALERT_STYLE[a.level];
                const Icon = st.icon;
                return (
                  <li key={a.id} className={cn("flex gap-3 rounded-xl border p-3", st.ring, st.bg)}>
                    <Icon className={cn("mt-0.5 size-4 shrink-0", st.text)} />
                    <div>
                      <p className="text-[13px] font-medium">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{a.message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <MarketWidget data-reveal className="xl:col-span-3" />
        <Panel
          data-reveal
          className="xl:col-span-3"
          title="Operações recentes"
          actions={
            <Link href="/operacoes" className="text-xs text-muted hover:text-fg">
              Histórico completo <ArrowRight className="inline size-3" />
            </Link>
          }
          bodyClassName="px-2 sm:px-3"
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={<CandlestickChart className="size-5" />}
              title="Nenhuma operação registrada"
              description="Registre manualmente ou importe o histórico da sua corretora."
              action={
                <Button variant="primary" onClick={() => openNew()}>
                  Registrar operação
                </Button>
              }
            />
          ) : (
            <div className="grid gap-x-4 md:grid-cols-2">
              {recent.map((t) => (
                <TradeRow key={t.id} trade={t} currency={cur} tz={p.tz} strategyName={t.strategyId ? strategyName(t.strategyId) : undefined} onClick={() => openEdit(t)} />
              ))}
            </div>
          )}
        </Panel>
      </RevealGroup>
    </>
  );
}

export function DashboardView() {
  return (
    <DataGate>
      <DashboardContent />
    </DataGate>
  );
}
