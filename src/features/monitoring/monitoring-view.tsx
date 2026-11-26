"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowRight, Clock, Radio, ShieldAlert, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IntradayChart, type IntradayDatum } from "@/components/charts/charts";
import { ALERT_STYLE } from "@/components/layout/alerts-bell";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Meter } from "@/components/ui/meter";
import { Badge, EmptyState, Panel } from "@/components/ui/misc";
import { timeAgo } from "@/features/activity/describe";
import { EventList } from "@/features/activity/event-list";
import { MoneyText, TradeRow } from "@/features/trades/trade-bits";
import { useReadyData } from "@/hooks/app-data";
import { useNowMinute } from "@/hooks/use-client-store";
import { useAudit, useSessions } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";

const REFRESH_MS = 20_000;

/** Re-reads account data every 20 s while the page is visible (the panel is "live"). */
function useLiveRefresh() {
  const qc = useQueryClient();
  // Rendered only on the client (behind DataGate), so reading the clock here is safe.
  const [updatedAt, setUpdatedAt] = useState<string>(() => new Date().toISOString());
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void Promise.all([
        qc.invalidateQueries({ queryKey: ["trades"] }),
        qc.invalidateQueries({ queryKey: ["cash"] }),
        qc.invalidateQueries({ queryKey: ["settings"] }),
        qc.invalidateQueries({ queryKey: ["audit"] }),
        qc.invalidateQueries({ queryKey: ["sessions"] }),
      ]).then(() => setUpdatedAt(new Date().toISOString()));
    };
    const id = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [qc]);
  return updatedAt;
}

function MonitoringContent() {
  const { portfolio: p, settings, risk: m, alerts, strategyName } = useReadyData();
  const updatedAt = useLiveRefresh();
  const activity = useAudit("activity", { limit: 25 });
  const security = useAudit("security", { limit: 40 });
  const sessions = useSessions();
  const now = useNowMinute();
  const cur = settings.currency;
  const tz = settings.timezone;
  const today = p.todayStats;
  const todayTrades = p.todayTrades;

  const danger = alerts.filter((a) => a.level === "danger");
  const warning = alerts.filter((a) => a.level === "warning");
  const status = danger.length
    ? { label: "Limite atingido", tone: "neg" as const, icon: ShieldAlert, text: "text-neg", ring: "border-neg/30 bg-neg/[0.06]" }
    : warning.length
      ? { label: "Atenção", tone: "warn" as const, icon: ShieldAlert, text: "text-warn", ring: "border-warn/30 bg-warn/[0.06]" }
      : { label: "Dentro dos parâmetros", tone: "pos" as const, icon: ShieldCheck, text: "text-pos", ring: "border-pos/25 bg-pos/[0.05]" };

  const intraday = useMemo<IntradayDatum[]>(() => {
    if (!todayTrades.length) return [];
    let cum = 0;
    const points: IntradayDatum[] = [{ label: "Início", detail: "Antes da primeira operação", cumulative: 0, delta: 0 }];
    for (const t of todayTrades) {
      cum += t.profitCents;
      points.push({ label: formatTime(t.executedAt, tz), detail: `${formatTime(t.executedAt, tz)} · ${t.asset} ${t.direction}`, cumulative: cum, delta: t.profitCents });
    }
    return points;
  }, [todayTrades, tz]);

  const first = todayTrades[0];
  const last = todayTrades[todayTrades.length - 1];
  const since = now - 24 * 3600 * 1000;
  const failed24h = (security.data ?? []).filter((e) => (e.action === "auth.login_failed" || e.action === "auth.locked") && new Date(e.createdAt).getTime() > since).length;
  const activeSessions = sessions.data?.length ?? 0;
  const StatusIcon = status.icon;

  return (
    <>
      <PageHeader
        title="Monitoramento"
        description="Acompanhamento ao vivo da sessão de hoje: resultado, limites, alertas e tudo o que foi alterado na conta."
        actions={
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-xs text-muted" data-testid="live-indicator">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-pos/60" />
              <span className="relative inline-flex size-2 rounded-full bg-pos" />
            </span>
            Ao vivo{updatedAt ? ` · atualizado às ${formatTime(updatedAt, tz)}` : ""}
          </span>
        }
      />

      <section className={cn("glass mb-4 grid gap-4 rounded-2xl border p-4 sm:p-5 lg:grid-cols-[1.3fr_repeat(4,1fr)]", status.ring)} data-testid="session-status">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-11 place-items-center rounded-xl border", status.ring, status.text)}>
            <StatusIcon className="size-5" />
          </span>
          <div>
            <p className="label-caps">Status da sessão</p>
            <p className={cn("text-lg font-semibold", status.text)}>{status.label}</p>
            <p className="text-xs text-muted">
              {danger.length + warning.length ? `${danger.length + warning.length} alerta(s) ativo(s)` : "Nenhum limite atingido hoje"}
            </p>
          </div>
        </div>
        {[
          { label: "Resultado de hoje", value: <MoneyText cents={today.netCents} currency={cur} className="text-lg font-semibold" />, sub: today.returnPct !== null ? `${formatPct(today.returnPct, { signed: true, digits: 2 })} do saldo inicial do dia` : "" },
          { label: "Operações", value: <span className="num text-lg font-semibold">{today.count}</span>, sub: <><span className="text-pos">{today.wins} WIN</span> · <span className="text-neg">{today.losses} LOSS</span>{today.draws ? ` · ${today.draws} empate(s)` : ""}</> },
          { label: "Início da sessão", value: <span className="num text-lg font-semibold">{first ? formatTime(first.executedAt, tz) : "—"}</span>, sub: first ? `Primeira operação: ${first.asset}` : "Nenhuma operação hoje" },
          { label: "Última operação", value: <span className="num text-lg font-semibold">{last ? timeAgo(last.executedAt) : "—"}</span>, sub: last ? `${formatTime(last.executedAt, tz)} · ${last.asset}` : "" },
        ].map((c) => (
          <div key={c.label} className="border-line lg:border-l lg:pl-4">
            <p className="label-caps">{c.label}</p>
            <div className="mt-1">{c.value}</div>
            <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Resultado acumulado de hoje" subtitle="Operação por operação, com a meta diária e o limite de perda como referência">
          <IntradayChart data={intraday} currency={cur} goal={settings.dailyProfitGoalCents} lossLimit={settings.dailyLossLimitCents} />
        </Panel>
        <Panel title="Limites em tempo real" subtitle="Consumo dos parâmetros que você definiu">
          <div className="space-y-5">
            <Meter label="Perda do dia" current={Math.max(0, -today.netCents)} limit={settings.dailyLossLimitCents} format={(v) => formatMoney(v, cur)} />
            <Meter label="Meta diária" current={Math.max(0, today.netCents)} limit={settings.dailyProfitGoalCents} format={(v) => formatMoney(v, cur)} />
            <Meter label="Operações" current={today.count} limit={settings.maxTradesPerDay} format={(v) => String(v)} />
            <Meter label="Perdas consecutivas" current={m.todayLossStreak} limit={settings.maxConsecutiveLosses} format={(v) => String(v)} />
            <Meter label="Exposição do dia" current={m.capitalCommittedPct ?? 0} limit={settings.maxDailyExposurePct} format={(v) => formatPct(v)} />
            <Meter label="Drawdown atual" current={m.currentDrawdownPct} limit={settings.maxDrawdownPct} format={(v) => formatPct(v)} />
          </div>
        </Panel>

        <Panel title="Alertas ativos" subtitle="Atualizados a cada operação">
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nenhum alerta no momento.</p>
          ) : (
            <ul className="space-y-2" data-testid="monitor-alerts">
              {alerts.map((a) => {
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

        <Panel title="Operações de hoje" subtitle={todayTrades.length ? `${todayTrades.length} operação(ões)` : undefined} bodyClassName="px-2 sm:px-3">
          {todayTrades.length === 0 ? (
            <EmptyState icon={<Timer className="size-5" />} title="Sessão ainda não começou" description="As operações de hoje aparecem aqui assim que forem registradas." />
          ) : (
            <div className="max-h-[420px] overflow-y-auto" data-lenis-prevent>
              {[...todayTrades].reverse().map((t) => (
                <TradeRow key={t.id} trade={t} currency={cur} tz={tz} strategyName={t.strategyId ? strategyName(t.strategyId) : undefined} />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Segurança da conta"
          actions={
            <Link href="/seguranca" className="text-xs text-muted hover:text-fg">
              Ver detalhes <ArrowRight className="inline size-3" />
            </Link>
          }
        >
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted">
                <ShieldAlert className={cn("size-4", failed24h ? "text-warn" : "text-subtle")} /> Tentativas incorretas (24 h)
              </span>
              <span className={cn("num font-semibold", failed24h ? "text-warn" : "text-fg")}>{failed24h}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted">
                <Radio className="size-4 text-subtle" /> Sessões abertas
              </span>
              <span className="num font-semibold text-fg">{activeSessions}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted">
                <Clock className="size-4 text-subtle" /> Atualização automática
              </span>
              <Badge>a cada {REFRESH_MS / 1000} s</Badge>
            </li>
          </ul>
        </Panel>

        <Panel className="xl:col-span-3" title="Registro de atividades" subtitle="Tudo o que foi criado, alterado ou excluído na conta" actions={<Activity className="size-4 text-subtle" />} bodyClassName="px-3 sm:px-4">
          {activity.isPending ? (
            <div className="skeleton h-32 rounded-xl" />
          ) : (
            <EventList events={activity.data ?? []} currency={cur} timezone={tz} emptyText="Nenhuma alteração registrada ainda." testId="activity-log" />
          )}
        </Panel>
      </div>
    </>
  );
}

export function MonitoringView() {
  return (
    <DataGate>
      <MonitoringContent />
    </DataGate>
  );
}
