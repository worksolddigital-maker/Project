"use client";

import { motion } from "motion/react";
import { CalendarCheck2, CalendarRange, Flame, ListChecks, Target } from "lucide-react";
import { useMemo } from "react";
import { GoalBarChart, type PnlDatum } from "@/components/charts/charts";
import { DataGate, PageHeader } from "@/components/layout/page";
import { RevealGroup } from "@/components/motion/reveal";
import { Panel } from "@/components/ui/misc";
import { SettingsFieldsForm } from "@/features/settings/settings-fields";
import { useReadyData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import { formatDayKey, formatWeekLabel } from "@/lib/domain/dates";
import { computeGoals, dailyGoalHistory, goalStats, weeklyGoalHistory, type GoalItem } from "@/lib/domain/goals";
import { formatMoney, formatPct } from "@/lib/domain/money";

const ICONS = { daily: Target, weekly: CalendarRange, monthly: CalendarCheck2, maxTrades: ListChecks, maxLosses: Flame };

function Ring({ pct, tone }: { pct: number; tone: "pos" | "neg" | "warn" | "neutral" }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = tone === "pos" ? "var(--color-pos)" : tone === "neg" ? "var(--color-neg)" : tone === "warn" ? "var(--color-warn)" : "var(--color-fg)";
  return (
    <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
      <motion.circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.min(100, pct) / 100) }}
        transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

function GoalCard({ goal, currency }: { goal: GoalItem; currency: "BRL" | "USD" | "EUR" }) {
  const Icon = ICONS[goal.key];
  const fmt = (v: number) => (goal.unit === "money" ? formatMoney(v, currency, { signed: goal.kind === "profit" && v < 0 }) : String(v));
  const tone =
    goal.status === "reached" ? "pos" : goal.status === "breached" ? "neg" : goal.status === "near" ? "warn" : goal.status === "safe" ? "pos" : "neutral";
  const statusText: Record<GoalItem["status"], string> = {
    unset: "Não definida",
    pending: "Sem progresso",
    progress: "Em andamento",
    reached: "Meta atingida",
    safe: "Dentro do limite",
    near: "Próximo do limite",
    breached: "Limite atingido",
  };
  const remaining = goal.target !== null && goal.kind === "profit" && goal.current < goal.target ? goal.target - goal.current : null;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className="glass flex items-center gap-4 rounded-2xl p-5"
      data-testid={`goal-${goal.key}`}
    >
      <div className="relative grid place-items-center">
        <Ring pct={goal.progressPct} tone={tone} />
        <span className="num absolute text-sm font-semibold">{goal.target === null ? "—" : `${Math.round(goal.progressPct)}%`}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Icon className="size-3.5" /> {goal.label}
        </p>
        <p className={cn("num mt-1 text-lg font-semibold", goal.kind === "profit" ? (goal.current > 0 ? "text-pos" : goal.current < 0 ? "text-neg" : "text-fg") : "text-fg")}>
          {fmt(goal.current)}
          {goal.target !== null && <span className="text-sm font-normal text-subtle"> / {fmt(goal.target)}</span>}
        </p>
        <p className={cn("mt-0.5 text-xs", tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : "text-subtle")}>
          {statusText[goal.status]}
          {remaining !== null && <span className="text-subtle"> · faltam {formatMoney(remaining, currency)}</span>}
        </p>
      </div>
    </motion.div>
  );
}

function GoalsContent() {
  const { portfolio: p, settings } = useReadyData();
  const cur = settings.currency;
  const goals = computeGoals(p, settings);
  const stats = goalStats(p, settings);

  const daily = useMemo<PnlDatum[]>(
    () =>
      dailyGoalHistory(p, settings, 30).map((d) => {
        const day = p.days.get(d.key);
        return { label: formatDayKey(d.key, "dayMonth"), detail: formatDayKey(d.key, "long"), net: d.netCents, count: day?.count ?? 0, wins: day?.wins ?? 0, losses: day?.losses ?? 0 };
      }),
    [p, settings],
  );
  const weekly = useMemo<PnlDatum[]>(
    () =>
      weeklyGoalHistory(p, settings, 12).map((w) => ({
        label: formatDayKey(w.key, "dayMonth"),
        detail: `Semana ${formatWeekLabel(w.key)}`,
        net: w.netCents,
        count: w.count,
        wins: 0,
        losses: 0,
      })),
    [p, settings],
  );

  return (
    <>
      <PageHeader title="Metas e desempenho" description="Acompanhe seus objetivos financeiros e os limites de disciplina que você definiu." />
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-[1760px]:grid-cols-5">
        {goals.map((g) => (
          <GoalCard key={g.key} goal={g} currency={cur} />
        ))}
      </motion.div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Dias operados", String(stats.tradingDays)],
          ["Dias com meta diária atingida", settings.dailyProfitGoalCents ? String(stats.daysGoalReached) : "—"],
          ["Aproveitamento da meta diária", formatPct(stats.hitRatePct)],
          ["Dias com limite de perda atingido", settings.dailyLossLimitCents ? String(stats.daysLossLimitHit) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-xl px-4 py-3">
            <p className="label-caps">{k}</p>
            <p className="num mt-1 text-lg font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <RevealGroup className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel data-reveal title="Últimos 30 dias × meta diária" subtitle={settings.dailyProfitGoalCents ? `Meta: ${formatMoney(settings.dailyProfitGoalCents, cur)}` : "Defina a meta diária para ver a linha de referência"}>
          <GoalBarChart data={daily} currency={cur} goal={settings.dailyProfitGoalCents} />
        </Panel>
        <Panel data-reveal title="Últimas 12 semanas × meta semanal" subtitle={settings.weeklyProfitGoalCents ? `Meta: ${formatMoney(settings.weeklyProfitGoalCents, cur)}` : "Defina a meta semanal para ver a linha de referência"}>
          <GoalBarChart data={weekly} currency={cur} goal={settings.weeklyProfitGoalCents} />
        </Panel>
        <Panel data-reveal className="xl:col-span-2" title="Definir metas e limites" subtitle="Deixe em branco para desativar.">
          <SettingsFieldsForm testId="goals-settings" columns={3} keys={["dailyProfitGoalCents", "weeklyProfitGoalCents", "monthlyProfitGoalCents", "maxTradesPerDay", "maxConsecutiveLosses"]} submitLabel="Salvar metas" />
        </Panel>
      </RevealGroup>
    </>
  );
}

export function GoalsView() {
  return (
    <DataGate>
      <GoalsContent />
    </DataGate>
  );
}
