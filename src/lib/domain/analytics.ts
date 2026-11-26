import { dayKeyOf, hourOf, inRange, monthKeyOf, todayKey, weekStartOf, weekdayOf, type DateRange, type DayKey } from "./dates";
import type { CashMovement, Trade, UserSettings } from "./types";

/* -------------------------------------------------------------------------- */
/*                                   Summary                                  */
/* -------------------------------------------------------------------------- */

export interface Summary {
  count: number;
  wins: number;
  losses: number;
  draws: number;
  /** wins / (wins + losses) × 100 — draws are excluded. Null when no decisive trades. */
  winRate: number | null;
  grossProfitCents: number;
  /** Absolute value of the sum of losing results. */
  grossLossCents: number;
  netCents: number;
  /** Average profit of winning trades. */
  avgWinCents: number | null;
  /** Average loss (absolute) of losing trades. */
  avgLossCents: number | null;
  /** Average net result per trade (expectancy). */
  expectancyCents: number | null;
  best: Trade | null;
  worst: Trade | null;
  /** Gross profit / gross loss. Null when there are no losses. */
  profitFactor: number | null;
  /** Average win / average loss. */
  payoffRatio: number | null;
  totalStakeCents: number;
  avgStakeCents: number | null;
  /** Net result relative to the total amount invested. */
  returnOnStakePct: number | null;
}

export function summarize(trades: readonly Trade[]): Summary {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let stake = 0;
  let best: Trade | null = null;
  let worst: Trade | null = null;
  for (const t of trades) {
    if (t.result === "WIN") wins++;
    else if (t.result === "LOSS") losses++;
    else draws++;
    if (t.profitCents > 0) grossProfit += t.profitCents;
    else if (t.profitCents < 0) grossLoss += -t.profitCents;
    stake += t.stakeCents;
    if (!best || t.profitCents > best.profitCents) best = t;
    if (!worst || t.profitCents < worst.profitCents) worst = t;
  }
  const count = trades.length;
  const decisive = wins + losses;
  const winningTrades = trades.filter((t) => t.profitCents > 0).length;
  const losingTrades = trades.filter((t) => t.profitCents < 0).length;
  const avgWin = winningTrades ? grossProfit / winningTrades : null;
  const avgLoss = losingTrades ? grossLoss / losingTrades : null;
  const net = grossProfit - grossLoss;
  return {
    count,
    wins,
    losses,
    draws,
    winRate: decisive ? (wins / decisive) * 100 : null,
    grossProfitCents: grossProfit,
    grossLossCents: grossLoss,
    netCents: net,
    avgWinCents: avgWin,
    avgLossCents: avgLoss,
    expectancyCents: count ? net / count : null,
    best: count ? best : null,
    worst: count ? worst : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    payoffRatio: avgWin !== null && avgLoss !== null && avgLoss > 0 ? avgWin / avgLoss : null,
    totalStakeCents: stake,
    avgStakeCents: count ? stake / count : null,
    returnOnStakePct: stake > 0 ? (net / stake) * 100 : null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Ordering                                  */
/* -------------------------------------------------------------------------- */

export function compareTrades(a: Trade, b: Trade): number {
  if (a.executedAt !== b.executedAt) return a.executedAt < b.executedAt ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Chronological (oldest first) copy. ISO-8601 UTC strings sort lexicographically. */
export function sortTrades(trades: readonly Trade[]): Trade[] {
  return [...trades].sort(compareTrades);
}

export function filterByRange(trades: readonly Trade[], range: DateRange, tz: string): Trade[] {
  if (!range.from && !range.to) return [...trades];
  return trades.filter((t) => inRange(dayKeyOf(t.executedAt, tz), range));
}

/* -------------------------------------------------------------------------- */
/*                                   Ledger                                   */
/* -------------------------------------------------------------------------- */

export type EquityPointKind = "START" | "TRADE" | "DEPOSIT" | "WITHDRAWAL";

export interface EquityPoint {
  index: number;
  at: string | null;
  dayKey: DayKey | null;
  kind: EquityPointKind;
  deltaCents: number;
  balanceCents: number;
  /** Cumulative trading P&L (excludes deposits/withdrawals). */
  pnlCumCents: number;
  drawdownCents: number;
  drawdownPct: number;
  refId: string | null;
}

export interface DrawdownStats {
  maxCents: number;
  maxPct: number;
  currentCents: number;
  currentPct: number;
}

export interface Ledger {
  points: EquityPoint[];
  balanceCents: number;
  depositsCents: number;
  withdrawalsCents: number;
  netPnlCents: number;
  balanceBeforeTrade: Map<string, number>;
  /** Balance before the first event of each day that had activity. */
  dayStartBalance: Map<DayKey, number>;
  drawdown: DrawdownStats;
}

type LedgerEvent =
  | { at: string; order: 0; kind: "DEPOSIT" | "WITHDRAWAL"; delta: number; id: string; createdAt: string }
  | { at: string; order: 1; kind: "TRADE"; delta: number; id: string; createdAt: string };

/**
 * Replays cash movements and trades chronologically.
 *
 * Drawdown is measured on trading P&L only (deposits and withdrawals do not
 * create or hide drawdowns): dd = peak(P&L) − P&L. The percentage is relative
 * to the balance the account would have at the peak adjusted for cash flows:
 * dd / (balance + dd).
 */
export function buildLedger(
  trades: readonly Trade[],
  cash: readonly CashMovement[],
  initialCapitalCents: number,
  tz: string,
): Ledger {
  const events: LedgerEvent[] = [
    ...cash.map(
      (c) =>
        ({
          at: c.occurredAt,
          order: 0,
          kind: c.type,
          delta: c.type === "DEPOSIT" ? c.amountCents : -c.amountCents,
          id: c.id,
          createdAt: c.createdAt,
        }) as LedgerEvent,
    ),
    ...trades.map(
      (t) =>
        ({ at: t.executedAt, order: 1, kind: "TRADE", delta: t.profitCents, id: t.id, createdAt: t.createdAt }) as LedgerEvent,
    ),
  ];
  events.sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    if (a.order !== b.order) return a.order - b.order;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  let balance = initialCapitalCents;
  let pnl = 0;
  let peakPnl = 0;
  let deposits = 0;
  let withdrawals = 0;
  const dd: DrawdownStats = { maxCents: 0, maxPct: 0, currentCents: 0, currentPct: 0 };
  const points: EquityPoint[] = [
    {
      index: 0,
      at: null,
      dayKey: null,
      kind: "START",
      deltaCents: initialCapitalCents,
      balanceCents: balance,
      pnlCumCents: 0,
      drawdownCents: 0,
      drawdownPct: 0,
      refId: null,
    },
  ];
  const balanceBeforeTrade = new Map<string, number>();
  const dayStartBalance = new Map<DayKey, number>();

  for (const e of events) {
    const day = dayKeyOf(e.at, tz);
    if (!dayStartBalance.has(day)) dayStartBalance.set(day, balance);
    if (e.kind === "TRADE") {
      balanceBeforeTrade.set(e.id, balance);
      pnl += e.delta;
      if (pnl > peakPnl) peakPnl = pnl;
    } else if (e.kind === "DEPOSIT") {
      deposits += e.delta;
    } else {
      withdrawals += -e.delta;
    }
    balance += e.delta;
    const ddCents = peakPnl - pnl;
    const base = balance + ddCents;
    const ddPct = ddCents > 0 ? (base > 0 ? Math.min(100, (ddCents / base) * 100) : 100) : 0;
    if (ddCents > dd.maxCents) dd.maxCents = ddCents;
    if (ddPct > dd.maxPct) dd.maxPct = ddPct;
    points.push({
      index: points.length,
      at: e.at,
      dayKey: day,
      kind: e.kind,
      deltaCents: e.delta,
      balanceCents: balance,
      pnlCumCents: pnl,
      drawdownCents: ddCents,
      drawdownPct: ddPct,
      refId: e.id,
    });
  }
  const last = points[points.length - 1];
  dd.currentCents = last.drawdownCents;
  dd.currentPct = last.drawdownPct;

  return {
    points,
    balanceCents: balance,
    depositsCents: deposits,
    withdrawalsCents: withdrawals,
    netPnlCents: pnl,
    balanceBeforeTrade,
    dayStartBalance,
    drawdown: dd,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Streaks                                  */
/* -------------------------------------------------------------------------- */

export interface Streaks {
  currentLoss: number;
  currentWin: number;
  maxLoss: number;
  maxWin: number;
}

/** Draws are neutral: they neither break nor extend a streak. Expects chronological input. */
export function computeStreaks(sorted: readonly Trade[]): Streaks {
  let curLoss = 0;
  let curWin = 0;
  let maxLoss = 0;
  let maxWin = 0;
  for (const t of sorted) {
    if (t.result === "WIN") {
      curWin++;
      curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (t.result === "LOSS") {
      curLoss++;
      curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    }
  }
  return { currentLoss: curLoss, currentWin: curWin, maxLoss, maxWin };
}

/* -------------------------------------------------------------------------- */
/*                                 Aggregation                                */
/* -------------------------------------------------------------------------- */

export interface Bucket {
  key: string;
  count: number;
  wins: number;
  losses: number;
  draws: number;
  netCents: number;
  grossProfitCents: number;
  grossLossCents: number;
  stakeCents: number;
  winRate: number | null;
}

function emptyBucket(key: string): Bucket {
  return {
    key,
    count: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    netCents: 0,
    grossProfitCents: 0,
    grossLossCents: 0,
    stakeCents: 0,
    winRate: null,
  };
}

function addToBucket(b: Bucket, t: Trade) {
  b.count++;
  if (t.result === "WIN") b.wins++;
  else if (t.result === "LOSS") b.losses++;
  else b.draws++;
  b.netCents += t.profitCents;
  if (t.profitCents > 0) b.grossProfitCents += t.profitCents;
  else b.grossLossCents += -t.profitCents;
  b.stakeCents += t.stakeCents;
  const decisive = b.wins + b.losses;
  b.winRate = decisive ? (b.wins / decisive) * 100 : null;
}

export function aggregate(trades: readonly Trade[], keyFn: (t: Trade) => string): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const t of trades) {
    const key = keyFn(t);
    let b = map.get(key);
    if (!b) {
      b = emptyBucket(key);
      map.set(key, b);
    }
    addToBucket(b, t);
  }
  return map;
}

export interface DayStats extends Bucket {
  startBalanceCents: number | null;
  /** Net result relative to the balance at the start of the day. */
  returnPct: number | null;
}

export function groupByDay(trades: readonly Trade[], tz: string, dayStartBalance?: Map<DayKey, number>): Map<DayKey, DayStats> {
  const buckets = aggregate(trades, (t) => dayKeyOf(t.executedAt, tz));
  const out = new Map<DayKey, DayStats>();
  for (const [key, b] of buckets) {
    const start = dayStartBalance?.get(key) ?? null;
    out.set(key, {
      ...b,
      startBalanceCents: start,
      returnPct: start !== null && start > 0 ? (b.netCents / start) * 100 : null,
    });
  }
  return out;
}

export function emptyDayStats(dayKey: DayKey, startBalance: number | null): DayStats {
  return { ...emptyBucket(dayKey), startBalanceCents: startBalance, returnPct: startBalance && startBalance > 0 ? 0 : null };
}

export const groupByWeek = (trades: readonly Trade[], tz: string) =>
  aggregate(trades, (t) => weekStartOf(dayKeyOf(t.executedAt, tz)));

export const groupByMonth = (trades: readonly Trade[], tz: string) =>
  aggregate(trades, (t) => monthKeyOf(dayKeyOf(t.executedAt, tz)));

export const NO_STRATEGY_KEY = "__none__";

export function groupByAsset(trades: readonly Trade[]): Bucket[] {
  return [...aggregate(trades, (t) => t.asset).values()].sort((a, b) => b.netCents - a.netCents);
}

export function groupByStrategy(trades: readonly Trade[]): Bucket[] {
  return [...aggregate(trades, (t) => t.strategyId ?? NO_STRATEGY_KEY).values()].sort((a, b) => b.netCents - a.netCents);
}

/** 24 hourly buckets (always all hours, empty ones included). */
export function groupByHour(trades: readonly Trade[], tz: string): Bucket[] {
  const map = aggregate(trades, (t) => String(hourOf(t.executedAt, tz)));
  return Array.from({ length: 24 }, (_, h) => map.get(String(h)) ?? emptyBucket(String(h)));
}

/** Matrix [weekday Monday=0..Sunday=6][hour 0..23] of net results and counts. */
export function weekdayHourMatrix(trades: readonly Trade[], tz: string): { netCents: number; count: number }[][] {
  const m = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ netCents: 0, count: 0 })));
  for (const t of trades) {
    const day = dayKeyOf(t.executedAt, tz);
    const wd = (weekdayOf(day) + 6) % 7;
    const h = hourOf(t.executedAt, tz);
    m[wd][h].netCents += t.profitCents;
    m[wd][h].count++;
  }
  return m;
}

export interface WinRatePoint {
  dayKey: DayKey;
  dailyWinRate: number | null;
  cumulativeWinRate: number | null;
  wins: number;
  losses: number;
}

export function winRateTimeline(sorted: readonly Trade[], tz: string): WinRatePoint[] {
  const out: WinRatePoint[] = [];
  let cumW = 0;
  let cumL = 0;
  const byDay = aggregate(sorted, (t) => dayKeyOf(t.executedAt, tz));
  const keys = [...byDay.keys()].sort();
  for (const k of keys) {
    const b = byDay.get(k)!;
    cumW += b.wins;
    cumL += b.losses;
    out.push({
      dayKey: k,
      dailyWinRate: b.winRate,
      cumulativeWinRate: cumW + cumL ? (cumW / (cumW + cumL)) * 100 : null,
      wins: b.wins,
      losses: b.losses,
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*                                  Portfolio                                 */
/* -------------------------------------------------------------------------- */

export interface Portfolio {
  tz: string;
  today: DayKey;
  initialCapitalCents: number;
  depositsCents: number;
  withdrawalsCents: number;
  /** Initial capital + deposits: the capital the trader put in. */
  contributedCents: number;
  balanceCents: number;
  netCents: number;
  /** Net trading result / contributed capital × 100. */
  returnPct: number | null;
  summary: Summary;
  ledger: Ledger;
  streaks: Streaks;
  sortedTrades: Trade[];
  days: Map<DayKey, DayStats>;
  todayStats: DayStats;
  todayTrades: Trade[];
  todayStartBalanceCents: number;
  todayStreaks: Streaks;
  weekStart: DayKey;
  weekNetCents: number;
  monthNetCents: number;
}

export interface PortfolioInput {
  trades: readonly Trade[];
  cash: readonly CashMovement[];
  settings: Pick<UserSettings, "initialCapitalCents" | "timezone">;
  now?: Date;
}

export function buildPortfolio({ trades, cash, settings, now = new Date() }: PortfolioInput): Portfolio {
  const tz = settings.timezone;
  const today = todayKey(tz, now);
  const sorted = sortTrades(trades);
  const ledger = buildLedger(sorted, cash, settings.initialCapitalCents, tz);
  const summary = summarize(sorted);
  const days = groupByDay(sorted, tz, ledger.dayStartBalance);
  const todayTrades = sorted.filter((t) => dayKeyOf(t.executedAt, tz) === today);
  const todayStart = ledger.dayStartBalance.get(today) ?? ledger.balanceCents;
  const todayStats = days.get(today) ?? emptyDayStats(today, todayStart);
  const weekStart = weekStartOf(today);
  const monthKey = monthKeyOf(today);
  let weekNet = 0;
  let monthNet = 0;
  for (const [k, d] of days) {
    if (k >= weekStart && k <= today) weekNet += d.netCents;
    if (monthKeyOf(k) === monthKey && k <= today) monthNet += d.netCents;
  }
  const contributed = settings.initialCapitalCents + ledger.depositsCents;
  return {
    tz,
    today,
    initialCapitalCents: settings.initialCapitalCents,
    depositsCents: ledger.depositsCents,
    withdrawalsCents: ledger.withdrawalsCents,
    contributedCents: contributed,
    balanceCents: ledger.balanceCents,
    netCents: summary.netCents,
    returnPct: contributed > 0 ? (summary.netCents / contributed) * 100 : null,
    summary,
    ledger,
    streaks: computeStreaks(sorted),
    sortedTrades: sorted,
    days,
    todayStats,
    todayTrades,
    todayStartBalanceCents: todayStart,
    todayStreaks: computeStreaks(todayTrades),
    weekStart,
    weekNetCents: weekNet,
    monthNetCents: monthNet,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Period comparison                             */
/* -------------------------------------------------------------------------- */

export interface ComparisonRow {
  key: string;
  label: string;
  a: number | null;
  b: number | null;
  /** b − a */
  delta: number | null;
  format: "money" | "pct" | "int" | "ratio";
  /** Whether a higher value is better. */
  higherIsBetter: boolean;
}

export function comparePeriods(a: Summary, b: Summary): ComparisonRow[] {
  const row = (
    key: string,
    label: string,
    pick: (s: Summary) => number | null,
    format: ComparisonRow["format"],
    higherIsBetter = true,
  ): ComparisonRow => {
    const va = pick(a);
    const vb = pick(b);
    return { key, label, a: va, b: vb, delta: va !== null && vb !== null ? vb - va : null, format, higherIsBetter };
  };
  return [
    row("net", "Resultado líquido", (s) => s.netCents, "money"),
    row("count", "Operações", (s) => s.count, "int"),
    row("winRate", "Taxa de acerto", (s) => s.winRate, "pct"),
    row("grossProfit", "Lucro bruto", (s) => s.grossProfitCents, "money"),
    row("grossLoss", "Prejuízo bruto", (s) => s.grossLossCents, "money", false),
    row("avgWin", "Lucro médio (WIN)", (s) => s.avgWinCents, "money"),
    row("avgLoss", "Perda média (LOSS)", (s) => s.avgLossCents, "money", false),
    row("expectancy", "Resultado médio por operação", (s) => s.expectancyCents, "money"),
    row("profitFactor", "Fator de lucro", (s) => s.profitFactor, "ratio"),
    row("roi", "Retorno sobre valor investido", (s) => s.returnOnStakePct, "pct"),
  ];
}
