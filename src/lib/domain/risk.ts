import type { Portfolio } from "./analytics";
import { formatMoney, formatPct } from "./money";
import type { Trade, UserSettings } from "./types";

export type AlertLevel = "danger" | "warning" | "success" | "info";

export interface RiskAlert {
  /** Stable id: used to detect newly triggered alerts. */
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
}

export interface RiskMetrics {
  /** Average of (stake / balance before trade) across all trades. */
  avgRiskPerTradePct: number | null;
  /** Last trade stake relative to the balance before it. */
  lastRiskPerTradePct: number | null;
  dailyExposureCents: number;
  /** Today's invested total / balance at start of day. */
  capitalCommittedPct: number | null;
  todayNetCents: number;
  /** How much of the daily loss limit was consumed (0-100+). */
  dailyLossUsedPct: number | null;
  maxDrawdownCents: number;
  maxDrawdownPct: number;
  currentDrawdownCents: number;
  currentDrawdownPct: number;
  currentLossStreak: number;
  todayLossStreak: number;
  maxLossStreak: number;
  payoffRatio: number | null;
  profitFactor: number | null;
  /** Trades today where the stake was raised right after a loss. */
  stakeIncreasesAfterLoss: Trade[];
  tradesAboveMaxStake: Trade[];
  tradesAboveRiskPct: Trade[];
}

/** Chronological trades where stake > previous trade's stake and the previous trade was a LOSS. */
export function stakeIncreasesAfterLoss(sorted: readonly Trade[]): Trade[] {
  const out: Trade[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.result === "LOSS" && cur.stakeCents > prev.stakeCents) out.push(cur);
  }
  return out;
}

export function computeRiskMetrics(p: Portfolio, s: UserSettings): RiskMetrics {
  const { ledger, sortedTrades, todayTrades } = p;
  let ratioSum = 0;
  let ratioCount = 0;
  for (const t of sortedTrades) {
    const before = ledger.balanceBeforeTrade.get(t.id);
    if (before !== undefined && before > 0) {
      ratioSum += t.stakeCents / before;
      ratioCount++;
    }
  }
  const last = sortedTrades[sortedTrades.length - 1];
  const lastBefore = last ? ledger.balanceBeforeTrade.get(last.id) : undefined;
  const exposure = todayTrades.reduce((acc, t) => acc + t.stakeCents, 0);
  const todayNet = p.todayStats.netCents;
  const riskPct = s.riskPerTradePct;
  return {
    avgRiskPerTradePct: ratioCount ? (ratioSum / ratioCount) * 100 : null,
    lastRiskPerTradePct: last && lastBefore && lastBefore > 0 ? (last.stakeCents / lastBefore) * 100 : null,
    dailyExposureCents: exposure,
    capitalCommittedPct: p.todayStartBalanceCents > 0 ? (exposure / p.todayStartBalanceCents) * 100 : null,
    todayNetCents: todayNet,
    dailyLossUsedPct:
      s.dailyLossLimitCents && s.dailyLossLimitCents > 0 ? (Math.max(0, -todayNet) / s.dailyLossLimitCents) * 100 : null,
    maxDrawdownCents: ledger.drawdown.maxCents,
    maxDrawdownPct: ledger.drawdown.maxPct,
    currentDrawdownCents: ledger.drawdown.currentCents,
    currentDrawdownPct: ledger.drawdown.currentPct,
    currentLossStreak: p.streaks.currentLoss,
    todayLossStreak: p.todayStreaks.currentLoss,
    maxLossStreak: p.streaks.maxLoss,
    payoffRatio: p.summary.payoffRatio,
    profitFactor: p.summary.profitFactor,
    stakeIncreasesAfterLoss: stakeIncreasesAfterLoss(todayTrades),
    tradesAboveMaxStake: s.maxStakeCents ? todayTrades.filter((t) => t.stakeCents > s.maxStakeCents!) : [],
    tradesAboveRiskPct:
      riskPct && riskPct > 0
        ? todayTrades.filter((t) => {
            const before = ledger.balanceBeforeTrade.get(t.id);
            return before !== undefined && before > 0 && (t.stakeCents / before) * 100 > riskPct + 1e-9;
          })
        : [],
  };
}

const WARN_RATIO = 0.8;

/**
 * Evaluates the user's own risk parameters against real data.
 * The system only reports; it never recommends entering or exiting trades.
 */
export function evaluateAlerts(p: Portfolio, s: UserSettings, m: RiskMetrics = computeRiskMetrics(p, s)): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const cur = s.currency;
  const today = p.today;
  const todayNet = p.todayStats.netCents;

  if (s.dailyLossLimitCents && s.dailyLossLimitCents > 0 && todayNet < 0) {
    const loss = -todayNet;
    if (loss >= s.dailyLossLimitCents) {
      alerts.push({
        id: `daily-loss-hit:${today}`,
        level: "danger",
        title: "Limite diário de perda atingido",
        message: `Resultado de hoje: ${formatMoney(todayNet, cur)}. Seu limite definido é ${formatMoney(s.dailyLossLimitCents, cur)}.`,
      });
    } else if (loss >= s.dailyLossLimitCents * WARN_RATIO) {
      alerts.push({
        id: `daily-loss-near:${today}`,
        level: "warning",
        title: "Próximo do limite diário de perda",
        message: `Você já consumiu ${formatPct(m.dailyLossUsedPct)} do limite de ${formatMoney(s.dailyLossLimitCents, cur)}.`,
      });
    }
  }

  if (s.maxConsecutiveLosses && s.maxConsecutiveLosses > 0) {
    const streak = p.todayStreaks.currentLoss;
    if (streak >= s.maxConsecutiveLosses) {
      alerts.push({
        id: `loss-streak-hit:${today}:${streak}`,
        level: "danger",
        title: "Limite de perdas consecutivas atingido",
        message: `${streak} perdas seguidas hoje. Limite definido: ${s.maxConsecutiveLosses}.`,
      });
    } else if (s.maxConsecutiveLosses > 1 && streak === s.maxConsecutiveLosses - 1) {
      alerts.push({
        id: `loss-streak-near:${today}:${streak}`,
        level: "warning",
        title: "Sequência de perdas em andamento",
        message: `${streak} perdas seguidas hoje — a próxima atinge o seu limite de ${s.maxConsecutiveLosses}.`,
      });
    }
  }

  if (s.maxTradesPerDay && s.maxTradesPerDay > 0) {
    const count = p.todayStats.count;
    if (count > s.maxTradesPerDay) {
      alerts.push({
        id: `max-trades-over:${today}:${count}`,
        level: "danger",
        title: "Quantidade máxima de operações ultrapassada",
        message: `${count} operações hoje para um máximo definido de ${s.maxTradesPerDay}.`,
      });
    } else if (count === s.maxTradesPerDay) {
      alerts.push({
        id: `max-trades-hit:${today}`,
        level: "warning",
        title: "Quantidade máxima de operações atingida",
        message: `Você chegou às ${s.maxTradesPerDay} operações definidas para o dia.`,
      });
    }
  }

  if (m.tradesAboveMaxStake.length && s.maxStakeCents) {
    alerts.push({
      id: `stake-above-max:${today}:${m.tradesAboveMaxStake.length}`,
      level: "warning",
      title: "Operação acima do valor máximo",
      message: `${m.tradesAboveMaxStake.length} operação(ões) hoje acima do máximo de ${formatMoney(s.maxStakeCents, cur)} por operação.`,
    });
  }

  if (m.tradesAboveRiskPct.length && s.riskPerTradePct) {
    alerts.push({
      id: `stake-above-risk:${today}:${m.tradesAboveRiskPct.length}`,
      level: "warning",
      title: "Risco por operação acima do definido",
      message: `${m.tradesAboveRiskPct.length} operação(ões) hoje comprometeram mais de ${formatPct(s.riskPerTradePct)} do saldo.`,
    });
  }

  if (s.maxDailyExposurePct && s.maxDailyExposurePct > 0 && m.capitalCommittedPct !== null) {
    if (m.capitalCommittedPct > s.maxDailyExposurePct) {
      alerts.push({
        id: `exposure-over:${today}`,
        level: "warning",
        title: "Exposição diária acima do limite",
        message: `Hoje você movimentou ${formatPct(m.capitalCommittedPct)} do saldo inicial do dia (limite: ${formatPct(s.maxDailyExposurePct)}).`,
      });
    }
  }

  if (s.maxDrawdownPct && s.maxDrawdownPct > 0 && m.currentDrawdownPct > 0) {
    if (m.currentDrawdownPct >= s.maxDrawdownPct) {
      alerts.push({
        id: `drawdown-hit`,
        level: "danger",
        title: "Drawdown máximo tolerado atingido",
        message: `Drawdown atual de ${formatPct(m.currentDrawdownPct)} (${formatMoney(-m.currentDrawdownCents, cur)}). Tolerância definida: ${formatPct(s.maxDrawdownPct)}.`,
      });
    } else if (m.currentDrawdownPct >= s.maxDrawdownPct * WARN_RATIO) {
      alerts.push({
        id: `drawdown-near`,
        level: "warning",
        title: "Drawdown se aproximando do limite",
        message: `Drawdown atual de ${formatPct(m.currentDrawdownPct)}. Tolerância definida: ${formatPct(s.maxDrawdownPct)}.`,
      });
    }
  }

  if (m.stakeIncreasesAfterLoss.length) {
    alerts.push({
      id: `stake-raise-after-loss:${today}:${m.stakeIncreasesAfterLoss.length}`,
      level: "warning",
      title: "Aumento de valor após perda",
      message: `${m.stakeIncreasesAfterLoss.length} vez(es) hoje o valor investido aumentou logo após um LOSS. Esse padrão costuma indicar tentativa de recuperação.`,
    });
  }

  if (p.balanceCents < 0) {
    alerts.push({
      id: "negative-balance",
      level: "danger",
      title: "Saldo calculado negativo",
      message: "Revise o capital inicial e as movimentações: o saldo calculado ficou abaixo de zero.",
    });
  }

  if (s.dailyProfitGoalCents && s.dailyProfitGoalCents > 0 && todayNet >= s.dailyProfitGoalCents) {
    alerts.push({
      id: `daily-goal:${today}`,
      level: "success",
      title: "Meta diária atingida",
      message: `Resultado de hoje: ${formatMoney(todayNet, cur, { signed: true })} (meta: ${formatMoney(s.dailyProfitGoalCents, cur)}).`,
    });
  }
  if (s.weeklyProfitGoalCents && s.weeklyProfitGoalCents > 0 && p.weekNetCents >= s.weeklyProfitGoalCents) {
    alerts.push({
      id: `weekly-goal:${p.weekStart}`,
      level: "success",
      title: "Meta semanal atingida",
      message: `Resultado da semana: ${formatMoney(p.weekNetCents, cur, { signed: true })}.`,
    });
  }
  if (s.monthlyProfitGoalCents && s.monthlyProfitGoalCents > 0 && p.monthNetCents >= s.monthlyProfitGoalCents) {
    alerts.push({
      id: `monthly-goal:${today.slice(0, 7)}`,
      level: "success",
      title: "Meta mensal atingida",
      message: `Resultado do mês: ${formatMoney(p.monthNetCents, cur, { signed: true })}.`,
    });
  }

  const order: Record<AlertLevel, number> = { danger: 0, warning: 1, success: 2, info: 3 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

export interface DraftCheckInput {
  stakeCents: number | null;
  dayKey: string;
  /** Id of the trade being edited (excluded from today's counts). */
  editingId?: string | null;
}

/** Pre-trade warnings shown inside the operation form (non-blocking). */
export function checkDraftTrade(p: Portfolio, s: UserSettings, draft: DraftCheckInput): string[] {
  const warnings: string[] = [];
  const cur = s.currency;
  if (draft.stakeCents && draft.stakeCents > 0) {
    if (s.maxStakeCents && draft.stakeCents > s.maxStakeCents) {
      warnings.push(`Valor acima do máximo por operação definido (${formatMoney(s.maxStakeCents, cur)}).`);
    }
    if (s.riskPerTradePct && p.balanceCents > 0) {
      const pct = (draft.stakeCents / p.balanceCents) * 100;
      if (pct > s.riskPerTradePct + 1e-9) {
        warnings.push(`Este valor representa ${formatPct(pct)} do saldo atual — acima do risco definido de ${formatPct(s.riskPerTradePct)}.`);
      }
    }
    if (p.balanceCents > 0 && draft.stakeCents > p.balanceCents) {
      warnings.push("O valor investido é maior que o saldo atual calculado.");
    }
  }
  if (draft.dayKey === p.today && !draft.editingId) {
    const day = p.todayStats;
    if (s.dailyLossLimitCents && -day.netCents >= s.dailyLossLimitCents) {
      warnings.push("Você já atingiu o limite diário de perda definido para hoje.");
    }
    if (s.maxTradesPerDay && day.count >= s.maxTradesPerDay) {
      warnings.push(`Você já registrou ${day.count} operações hoje (máximo definido: ${s.maxTradesPerDay}).`);
    }
    if (s.maxConsecutiveLosses && p.todayStreaks.currentLoss >= s.maxConsecutiveLosses) {
      warnings.push(`Sequência atual de ${p.todayStreaks.currentLoss} perdas atingiu o seu limite.`);
    }
  }
  return warnings;
}

export interface BehaviorStats {
  /** Times the stake was raised right after a LOSS (all history). */
  stakeRaisesAfterLoss: number;
  /** Trades executed on a day after the daily loss limit had already been reached. */
  tradesAfterLossLimit: number;
  daysLossLimitBreached: number;
  /** Days with more trades than the configured maximum. */
  daysOverMaxTrades: number;
  /** Days where the consecutive-loss limit was reached and trading continued. */
  daysContinuedAfterLossStreak: number;
  tradingDays: number;
}

/** Behavioural risk patterns derived from history (descriptive only). */
export function behaviorStats(sorted: readonly Trade[], tz: string, s: UserSettings, dayKeyOfTrade: (t: Trade) => string): BehaviorStats {
  const byDay = new Map<string, Trade[]>();
  for (const t of sorted) {
    const k = dayKeyOfTrade(t);
    const list = byDay.get(k);
    if (list) list.push(t);
    else byDay.set(k, [t]);
  }
  let afterLimit = 0;
  let daysBreached = 0;
  let daysOver = 0;
  let daysStreak = 0;
  for (const trades of byDay.values()) {
    let net = 0;
    let breached = false;
    let streak = 0;
    let streakHit = false;
    let continuedAfterStreak = false;
    for (const t of trades) {
      if (breached) afterLimit++;
      if (streakHit) continuedAfterStreak = true;
      net += t.profitCents;
      if (!breached && s.dailyLossLimitCents && -net >= s.dailyLossLimitCents) {
        breached = true;
        daysBreached++;
      }
      if (t.result === "LOSS") streak++;
      else if (t.result === "WIN") streak = 0;
      if (s.maxConsecutiveLosses && streak >= s.maxConsecutiveLosses) streakHit = true;
    }
    if (continuedAfterStreak) daysStreak++;
    if (s.maxTradesPerDay && trades.length > s.maxTradesPerDay) daysOver++;
  }
  void tz;
  return {
    stakeRaisesAfterLoss: stakeIncreasesAfterLoss(sorted).length,
    tradesAfterLossLimit: afterLimit,
    daysLossLimitBreached: daysBreached,
    daysOverMaxTrades: daysOver,
    daysContinuedAfterLossStreak: daysStreak,
    tradingDays: byDay.size,
  };
}
