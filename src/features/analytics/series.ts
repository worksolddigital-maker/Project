import type { EquityDatum, PnlDatum, WinRateDatum } from "@/components/charts/charts";
import {
  groupByDay,
  groupByHour,
  groupByMonth,
  groupByWeek,
  winRateTimeline,
  type Bucket,
  type DayStats,
  type Portfolio,
} from "@/lib/domain/analytics";
import {
  addDays,
  addMonths,
  diffDays,
  formatDateTime,
  formatDayKey,
  formatMonthKey,
  formatWeekLabel,
  type DateRange,
  type DayKey,
} from "@/lib/domain/dates";
import { formatPct } from "@/lib/domain/money";
import type { Trade } from "@/lib/domain/types";

const KIND_LABEL = { START: "Capital inicial", TRADE: "Operação", DEPOSIT: "Depósito", WITHDRAWAL: "Retirada" } as const;

/** Balance evolution. Large histories are compressed to end-of-day balances. */
export function equitySeries(p: Portfolio, range?: DateRange): EquityDatum[] {
  const tz = p.tz;
  let points = p.ledger.points;
  if (range && (range.from || range.to)) {
    const before = points.filter((pt) => pt.dayKey !== null && range.from && pt.dayKey < range.from);
    const inside = points.filter((pt) => pt.dayKey !== null && (!range.from || pt.dayKey >= range.from) && (!range.to || pt.dayKey <= range.to));
    const anchor = before.length ? before[before.length - 1] : points[0];
    points = [anchor, ...inside];
  }
  if (points.length > 500) {
    const byDay = new Map<string, (typeof points)[number] & { dayDelta: number }>();
    for (const pt of points) {
      const key = pt.dayKey ?? "start";
      const prev = byDay.get(key);
      byDay.set(key, { ...pt, dayDelta: (prev?.dayDelta ?? 0) + (pt.kind === "START" ? 0 : pt.deltaCents) });
    }
    return [...byDay.values()].map((pt) => ({
      label: pt.dayKey ? formatDayKey(pt.dayKey, "dayMonth") : "Início",
      detail: pt.dayKey ? `Fechamento de ${formatDayKey(pt.dayKey)}` : "Capital inicial",
      balance: pt.balanceCents,
      delta: pt.dayDelta,
      kind: pt.dayKey ? "Variação do dia" : "Capital inicial",
    }));
  }
  return points.map((pt) => ({
    label: pt.dayKey ? formatDayKey(pt.dayKey, "dayMonth") : "Início",
    detail: pt.at ? formatDateTime(pt.at, tz) : "Capital inicial",
    balance: pt.balanceCents,
    delta: pt.deltaCents,
    kind: KIND_LABEL[pt.kind],
  }));
}

const toPnl = (b: Bucket | undefined, label: string, detail: string, extra?: PnlDatum["extra"]): PnlDatum => ({
  label,
  detail,
  net: b?.netCents ?? 0,
  count: b?.count ?? 0,
  wins: b?.wins ?? 0,
  losses: b?.losses ?? 0,
  extra,
});

/** Daily P&L; continuous days for short ranges, trading days only otherwise. */
export function dailySeries(trades: readonly Trade[], p: Portfolio, range: DateRange): PnlDatum[] {
  const days = groupByDay(trades, p.tz, p.ledger.dayStartBalance);
  const keys = [...days.keys()].sort();
  if (!keys.length) return [];
  const from = range.from ?? keys[0];
  const to = range.to ?? keys[keys.length - 1];
  const extra = (d: DayStats | undefined) => (d?.returnPct != null ? [{ label: "Rentabilidade", value: formatPct(d.returnPct, { signed: true, digits: 2 }) }] : undefined);
  if (diffDays(to, from) <= 92) {
    const out: PnlDatum[] = [];
    for (let k = from; k <= to; k = addDays(k, 1)) {
      const d = days.get(k);
      out.push(toPnl(d, formatDayKey(k, "dayMonth"), formatDayKey(k, "long"), extra(d)));
    }
    return out;
  }
  return keys.map((k) => toPnl(days.get(k), formatDayKey(k, "dayMonth"), formatDayKey(k, "long"), extra(days.get(k))));
}

export function weeklySeries(trades: readonly Trade[], tz: string, maxWeeks = 26): PnlDatum[] {
  const weeks = groupByWeek(trades, tz);
  const keys = [...weeks.keys()].sort();
  if (!keys.length) return [];
  const out: PnlDatum[] = [];
  const last = keys[keys.length - 1];
  let start = keys[0];
  if (diffDays(last, start) / 7 > maxWeeks) start = addDays(last, -7 * (maxWeeks - 1));
  for (let k = start; k <= last; k = addDays(k, 7)) {
    const b = weeks.get(k);
    out.push(toPnl(b, formatDayKey(k, "dayMonth"), `Semana ${formatWeekLabel(k)}`, b?.winRate != null ? [{ label: "Taxa de acerto", value: formatPct(b.winRate) }] : undefined));
  }
  return out;
}

export function monthlySeries(trades: readonly Trade[], tz: string, maxMonths = 24): PnlDatum[] {
  const months = groupByMonth(trades, tz);
  const keys = [...months.keys()].sort();
  if (!keys.length) return [];
  const last = keys[keys.length - 1];
  let start = keys[0];
  const span = (Number(last.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(last.slice(5)) - Number(start.slice(5));
  if (span >= maxMonths) start = addMonths(last, -(maxMonths - 1));
  const out: PnlDatum[] = [];
  for (let k = start; k <= last; k = addMonths(k, 1)) {
    const b = months.get(k);
    out.push(toPnl(b, formatMonthKey(k, "short"), formatMonthKey(k), b?.winRate != null ? [{ label: "Taxa de acerto", value: formatPct(b.winRate) }] : undefined));
  }
  return out;
}

export function hourlySeries(trades: readonly Trade[], tz: string): PnlDatum[] {
  return groupByHour(trades, tz).map((b, h) =>
    toPnl(b, `${String(h).padStart(2, "0")}h`, `${String(h).padStart(2, "0")}:00 – ${String(h).padStart(2, "0")}:59`, b.winRate != null ? [{ label: "Taxa de acerto", value: formatPct(b.winRate) }] : undefined),
  );
}

export function winRateSeries(sorted: readonly Trade[], tz: string): WinRateDatum[] {
  return winRateTimeline(sorted, tz).map((pt) => ({
    label: formatDayKey(pt.dayKey, "dayMonth"),
    detail: formatDayKey(pt.dayKey, "long"),
    daily: pt.dailyWinRate,
    cumulative: pt.cumulativeWinRate,
    wins: pt.wins,
    losses: pt.losses,
  }));
}

export function lastNDaysRange(today: DayKey, n: number): DateRange {
  return { from: addDays(today, -(n - 1)), to: today };
}
