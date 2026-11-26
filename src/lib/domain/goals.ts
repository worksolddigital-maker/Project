import type { Portfolio } from "./analytics";
import { addDays, monthKeyOf, weekStartOf, type DayKey } from "./dates";
import type { UserSettings } from "./types";

export type GoalKind = "profit" | "limit";
export type GoalStatus = "unset" | "pending" | "progress" | "reached" | "safe" | "near" | "breached";

export interface GoalItem {
  key: "daily" | "weekly" | "monthly" | "maxTrades" | "maxLosses";
  label: string;
  kind: GoalKind;
  /** Current value (cents for profit goals, counts for limits). */
  current: number;
  target: number | null;
  /** 0-100, clamped. */
  progressPct: number;
  status: GoalStatus;
  unit: "money" | "count";
}

function profitGoal(key: GoalItem["key"], label: string, current: number, target: number | null): GoalItem {
  if (!target || target <= 0) {
    return { key, label, kind: "profit", current, target: null, progressPct: 0, status: "unset", unit: "money" };
  }
  const pct = Math.max(0, Math.min(100, (current / target) * 100));
  const status: GoalStatus = current >= target ? "reached" : current > 0 ? "progress" : "pending";
  return { key, label, kind: "profit", current, target, progressPct: pct, status, unit: "money" };
}

function limitGoal(key: GoalItem["key"], label: string, current: number, limit: number | null): GoalItem {
  if (!limit || limit <= 0) {
    return { key, label, kind: "limit", current, target: null, progressPct: 0, status: "unset", unit: "count" };
  }
  const pct = Math.max(0, Math.min(100, (current / limit) * 100));
  const status: GoalStatus = current >= limit ? "breached" : current >= limit * 0.8 || current === limit - 1 ? "near" : "safe";
  return { key, label, kind: "limit", current, target: limit, progressPct: pct, status, unit: "count" };
}

export function computeGoals(p: Portfolio, s: UserSettings): GoalItem[] {
  return [
    profitGoal("daily", "Meta diária", p.todayStats.netCents, s.dailyProfitGoalCents),
    profitGoal("weekly", "Meta semanal", p.weekNetCents, s.weeklyProfitGoalCents),
    profitGoal("monthly", "Meta mensal", p.monthNetCents, s.monthlyProfitGoalCents),
    limitGoal("maxTrades", "Operações hoje", p.todayStats.count, s.maxTradesPerDay),
    limitGoal("maxLosses", "Perdas consecutivas (hoje)", p.todayStreaks.currentLoss, s.maxConsecutiveLosses),
  ];
}

export interface GoalHistoryPoint {
  key: string;
  netCents: number;
  count: number;
  goalCents: number | null;
  reached: boolean | null;
}

/** Last `n` calendar days ending today with the daily goal comparison. */
export function dailyGoalHistory(p: Portfolio, s: UserSettings, n = 30): GoalHistoryPoint[] {
  const out: GoalHistoryPoint[] = [];
  const goal = s.dailyProfitGoalCents && s.dailyProfitGoalCents > 0 ? s.dailyProfitGoalCents : null;
  for (let i = n - 1; i >= 0; i--) {
    const key = addDays(p.today, -i);
    const day = p.days.get(key);
    const net = day?.netCents ?? 0;
    out.push({ key, netCents: net, count: day?.count ?? 0, goalCents: goal, reached: goal && day ? net >= goal : null });
  }
  return out;
}

/** Last `n` weeks (Monday starts) with weekly goal comparison. */
export function weeklyGoalHistory(p: Portfolio, s: UserSettings, n = 12): GoalHistoryPoint[] {
  const goal = s.weeklyProfitGoalCents && s.weeklyProfitGoalCents > 0 ? s.weeklyProfitGoalCents : null;
  const currentWeek = weekStartOf(p.today);
  const totals = new Map<DayKey, { net: number; count: number }>();
  for (const [k, d] of p.days) {
    const w = weekStartOf(k);
    const cur = totals.get(w) ?? { net: 0, count: 0 };
    cur.net += d.netCents;
    cur.count += d.count;
    totals.set(w, cur);
  }
  const out: GoalHistoryPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const w = addDays(currentWeek, -7 * i);
    const t = totals.get(w);
    out.push({ key: w, netCents: t?.net ?? 0, count: t?.count ?? 0, goalCents: goal, reached: goal && t ? t.net >= goal : null });
  }
  return out;
}

export interface GoalStats {
  tradingDays: number;
  daysGoalReached: number;
  daysLossLimitHit: number;
  hitRatePct: number | null;
}

/** Over all trading days: how often the daily goal was reached / loss limit hit. */
export function goalStats(p: Portfolio, s: UserSettings): GoalStats {
  let tradingDays = 0;
  let reached = 0;
  let lossHit = 0;
  for (const d of p.days.values()) {
    tradingDays++;
    if (s.dailyProfitGoalCents && d.netCents >= s.dailyProfitGoalCents) reached++;
    if (s.dailyLossLimitCents && -d.netCents >= s.dailyLossLimitCents) lossHit++;
  }
  return {
    tradingDays,
    daysGoalReached: reached,
    daysLossLimitHit: lossHit,
    hitRatePct: s.dailyProfitGoalCents && tradingDays ? (reached / tradingDays) * 100 : null,
  };
}

export function monthNet(p: Portfolio, monthKey: string): number {
  let total = 0;
  for (const [k, d] of p.days) if (monthKeyOf(k) === monthKey) total += d.netCents;
  return total;
}
