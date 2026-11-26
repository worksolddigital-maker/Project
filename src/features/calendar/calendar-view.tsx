"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, ChevronLeft, ChevronRight, NotebookPen, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Panel } from "@/components/ui/misc";
import { MoneyText, TradeRow } from "@/features/trades/trade-bits";
import { useTradeModal } from "@/features/trades/trade-modal-context";
import { useReadyData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import { type DayStats } from "@/lib/domain/analytics";
import { addMonths, dayKeyOf, formatDayKey, formatMonthKey, monthGrid, monthKeyOf, WEEKDAY_LABELS_MON_FIRST, type DayKey } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";
import { EMOTION_LABELS, PLAN_ADHERENCE_LABELS } from "@/lib/domain/types";

function DayDetails({ day, onClose }: { day: DayKey | null; onClose: () => void }) {
  const { portfolio: p, settings, journal, strategyName } = useReadyData();
  const { openNew, openEdit } = useTradeModal();
  const cur = settings.currency;
  const stats = day ? p.days.get(day) : undefined;
  const trades = useMemo(() => (day ? p.sortedTrades.filter((t) => dayKeyOf(t.executedAt, p.tz) === day) : []), [day, p]);
  const notes = day ? journal.filter((j) => j.sessionDate === day) : [];

  return (
    <Modal
      open={!!day}
      onClose={onClose}
      variant="sheet"
      title={day ? formatDayKey(day, "long") : ""}
      description={stats ? `${stats.count} operação(ões) · ${stats.wins} WIN · ${stats.losses} LOSS${stats.draws ? ` · ${stats.draws} empate(s)` : ""}` : "Nenhuma operação neste dia"}
      footer={
        <>
          <Link href="/diario" onClick={onClose}>
            <Button variant="secondary" icon={<NotebookPen className="size-4" />}>
              Diário
            </Button>
          </Link>
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => {
              if (day) openNew({ dayKey: day });
            }}
            disabled={!day || day > p.today}
          >
            Operação neste dia
          </Button>
        </>
      }
    >
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            ["Resultado", <MoneyText key="n" cents={stats.netCents} currency={cur} className="text-lg font-semibold" />],
            ["Rentabilidade do dia", <span key="r" className={cn("num text-lg font-semibold", (stats.returnPct ?? 0) > 0 ? "text-pos" : (stats.returnPct ?? 0) < 0 ? "text-neg" : "")}>{formatPct(stats.returnPct, { signed: true, digits: 2 })}</span>],
            ["Taxa de acerto", <span key="w" className="num text-lg font-semibold">{formatPct(stats.winRate)}</span>],
            ["Total investido", <span key="s" className="num text-lg font-semibold">{formatMoney(stats.stakeCents, cur)}</span>],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-line bg-white/[0.02] p-3">
              <p className="label-caps">{label}</p>
              <div className="mt-1">{value}</div>
            </div>
          ))}
        </div>
      )}
      {trades.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="size-5" />} title="Sem operações" description="Nenhuma operação registrada nesta data." />
      ) : (
        <div className="-mx-2" data-testid="day-trades">
          {trades.map((t) => (
            <TradeRow key={t.id} trade={t} currency={cur} tz={p.tz} strategyName={t.strategyId ? strategyName(t.strategyId) : undefined} onClick={() => openEdit(t)} />
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <div className="mt-6">
          <p className="label-caps mb-2">Diário de trading</p>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-line p-3 text-xs text-muted">
                <p className="text-fg">
                  {EMOTION_LABELS[n.emotion]} · Seguiu o gerenciamento: {PLAN_ADHERENCE_LABELS[n.followedPlan]}
                  {n.impulsive && <span className="text-warn"> · Operou por impulso</span>}
                </p>
                {n.mainMistake && <p className="mt-1">Erro: {n.mainMistake}</p>}
                {n.didRight && <p className="mt-0.5">Acerto: {n.didRight}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

const compactFormatter = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Very short signed amount for narrow phone cells (currency symbol omitted). */
function compactSigned(cents: number) {
  const v = Math.abs(cents) / 100;
  const body = v < 1000 ? String(Math.round(v)) : compactFormatter.format(v);
  return cents > 0 ? `+${body}` : cents < 0 ? `−${body}` : "0";
}

function DayCell({ day, stats, inMonth, isToday, onClick, currency }: { day: DayKey; stats?: DayStats; inMonth: boolean; isToday: boolean; onClick: () => void; currency: "BRL" | "USD" | "EUR" }) {
  const net = stats?.netCents ?? 0;
  const tone = !stats ? "none" : net > 0 ? "pos" : net < 0 ? "neg" : "flat";
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`cal-day-${day}`}
      className={cn(
        "group focus-ring relative flex min-h-[64px] flex-col rounded-xl border p-1.5 text-left transition-[transform,border-color,background-color] duration-300 hover:-translate-y-0.5 sm:min-h-[104px] sm:p-2.5",
        !inMonth && "opacity-35",
        tone === "pos" && "border-pos/25 bg-pos/[0.09] hover:border-pos/45",
        tone === "neg" && "border-neg/25 bg-neg/[0.09] hover:border-neg/45",
        tone === "flat" && "border-line-strong bg-white/[0.04]",
        tone === "none" && "border-line bg-white/[0.015] hover:border-line-strong",
        isToday && "ring-1 ring-fg/60",
      )}
      aria-label={`${formatDayKey(day)}${stats ? `: ${formatMoney(net, currency, { signed: true })}, ${stats.count} operações` : ": sem operações"}`}
    >
      <span className={cn("num text-[11px] sm:text-xs", isToday ? "font-semibold text-fg" : "text-muted")}>{Number(day.slice(8))}</span>
      {stats && (
        <>
          <span className={cn("num mt-auto truncate text-[10.5px] font-semibold sm:text-sm", net > 0 ? "text-pos" : net < 0 ? "text-neg" : "text-fg")}>
            <span className="sm:hidden">{compactSigned(net)}</span>
            <span className="hidden sm:inline">{formatMoney(net, currency, { signed: true })}</span>
          </span>
          <span className="mt-0.5 hidden text-[11px] text-muted sm:block">
            {stats.count} op · <span className="text-pos">{stats.wins}W</span> <span className="text-neg">{stats.losses}L</span>
          </span>
          <span className="num hidden text-[11px] text-subtle sm:block">{formatPct(stats.returnPct, { signed: true, digits: 2 })}</span>
        </>
      )}
    </button>
  );
}

function CalendarContent() {
  const { portfolio: p, settings } = useReadyData();
  const cur = settings.currency;
  const [month, setMonth] = useState(() => monthKeyOf(p.today));
  const [selected, setSelected] = useState<DayKey | null>(null);
  const [dir, setDir] = useState(0);
  const weeks = useMemo(() => monthGrid(month), [month]);

  const monthStats = useMemo(() => {
    let net = 0;
    let wins = 0;
    let losses = 0;
    let count = 0;
    let pos = 0;
    let neg = 0;
    let best: DayStats | null = null;
    let worst: DayStats | null = null;
    let days = 0;
    for (const [k, d] of p.days) {
      if (monthKeyOf(k) !== month) continue;
      days++;
      net += d.netCents;
      wins += d.wins;
      losses += d.losses;
      count += d.count;
      if (d.netCents > 0) pos++;
      if (d.netCents < 0) neg++;
      if (!best || d.netCents > best.netCents) best = d;
      if (!worst || d.netCents < worst.netCents) worst = d;
    }
    return { net, wins, losses, count, pos, neg, best, worst, days };
  }, [p, month]);

  const go = (n: number) => {
    setDir(n);
    setMonth((m) => addMonths(m, n));
  };

  return (
    <>
      <PageHeader
        title="Calendário de trading"
        description="Resultado financeiro dia a dia. Clique em um dia para ver as operações."
        actions={
          <div className="flex items-center gap-2">
            <Button size="icon" variant="secondary" onClick={() => go(-1)} aria-label="Mês anterior" data-testid="cal-prev">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[160px] text-center text-sm font-medium" data-testid="cal-month">
              {formatMonthKey(month).replace(/^./, (c) => c.toUpperCase())}
            </span>
            <Button size="icon" variant="secondary" onClick={() => go(1)} aria-label="Próximo mês" data-testid="cal-next">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => setMonth(monthKeyOf(p.today))} disabled={month === monthKeyOf(p.today)}>
              Hoje
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Resultado do mês", value: <MoneyText cents={monthStats.net} currency={cur} className="text-base font-semibold" /> },
          { label: "Dias operados", value: <span className="num text-base font-semibold">{monthStats.days}</span> },
          { label: "Dias positivos / negativos", value: <span className="num text-base font-semibold"><span className="text-pos">{monthStats.pos}</span> / <span className="text-neg">{monthStats.neg}</span></span> },
          { label: "Operações", value: <span className="num text-base font-semibold">{monthStats.count}</span> },
          { label: "Melhor dia", value: monthStats.best ? <MoneyText cents={monthStats.best.netCents} currency={cur} className="text-base font-semibold" /> : <span className="text-subtle">—</span> },
          { label: "Pior dia", value: monthStats.worst ? <MoneyText cents={monthStats.worst.netCents} currency={cur} className="text-base font-semibold" /> : <span className="text-subtle">—</span> },
        ].map((c) => (
          <div key={c.label} className="glass rounded-xl px-4 py-3">
            <p className="label-caps">{c.label}</p>
            <div className="mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <Panel bodyClassName="p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 xl:grid-cols-[repeat(7,minmax(0,1fr))_120px]">
          {WEEKDAY_LABELS_MON_FIRST.map((d) => (
            <div key={d} className="pb-1 text-center text-[11px] font-medium tracking-wider text-subtle uppercase">
              {d}
            </div>
          ))}
          <div className="hidden pb-1 text-center text-[11px] font-medium tracking-wider text-subtle uppercase xl:block">Semana</div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={month}
            initial={{ opacity: 0, x: dir * 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: dir * -24, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-1.5 sm:gap-2"
          >
            {weeks.map((week) => {
              let wNet = 0;
              let wCount = 0;
              week.forEach((d) => {
                const s = p.days.get(d);
                if (s && monthKeyOf(d) === month) {
                  wNet += s.netCents;
                  wCount += s.count;
                }
              });
              return (
                <div key={week[0]} className="grid grid-cols-7 gap-1.5 sm:gap-2 xl:grid-cols-[repeat(7,minmax(0,1fr))_120px]">
                  {week.map((d) => (
                    <DayCell key={d} day={d} stats={p.days.get(d)} inMonth={monthKeyOf(d) === month} isToday={d === p.today} currency={cur} onClick={() => setSelected(d)} />
                  ))}
                  <div className="hidden flex-col justify-center rounded-xl border border-line bg-white/[0.02] px-3 xl:flex">
                    <MoneyText cents={wNet} currency={cur} className="text-sm font-semibold" />
                    <span className="text-[11px] text-subtle">{wCount} operação(ões)</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded border border-pos/40 bg-pos/20" /> Dia positivo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded border border-neg/40 bg-neg/20" /> Dia negativo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded border border-line-strong bg-white/[0.06]" /> Resultado zero
          </span>
        </div>
      </Panel>

      <DayDetails day={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export function CalendarView() {
  return (
    <DataGate>
      <CalendarContent />
    </DataGate>
  );
}
