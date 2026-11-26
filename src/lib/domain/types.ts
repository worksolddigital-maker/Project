/**
 * Core domain types. All monetary values are integer cents to avoid
 * floating point drift in financial calculations.
 */

export const DIRECTIONS = ["CALL", "PUT"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const TRADE_RESULTS = ["WIN", "LOSS", "DRAW"] as const;
export type TradeResult = (typeof TRADE_RESULTS)[number];

export const RESULT_LABELS: Record<TradeResult, string> = {
  WIN: "WIN",
  LOSS: "LOSS",
  DRAW: "EMPATE",
};

export const CURRENCIES = ["BRL", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CASH_MOVEMENT_TYPES = ["DEPOSIT", "WITHDRAWAL"] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

export const EMOTIONS = [
  "CALM",
  "CONFIDENT",
  "FOCUSED",
  "ANXIOUS",
  "FEARFUL",
  "GREEDY",
  "FRUSTRATED",
  "EUPHORIC",
  "TIRED",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_LABELS: Record<Emotion, string> = {
  CALM: "Calmo",
  CONFIDENT: "Confiante",
  FOCUSED: "Focado",
  ANXIOUS: "Ansioso",
  FEARFUL: "Com medo",
  GREEDY: "Ganancioso",
  FRUSTRATED: "Frustrado",
  EUPHORIC: "Eufórico",
  TIRED: "Cansado",
};

/** Emotions usually associated with disciplined execution. */
export const POSITIVE_EMOTIONS: ReadonlySet<Emotion> = new Set(["CALM", "CONFIDENT", "FOCUSED"]);

export const PLAN_ADHERENCE = ["YES", "PARTIAL", "NO"] as const;
export type PlanAdherence = (typeof PLAN_ADHERENCE)[number];

export const PLAN_ADHERENCE_LABELS: Record<PlanAdherence, string> = {
  YES: "Sim",
  PARTIAL: "Parcialmente",
  NO: "Não",
};

export interface Trade {
  id: string;
  /** ISO-8601 instant (UTC). */
  executedAt: string;
  asset: string;
  direction: Direction;
  stakeCents: number;
  expirationSeconds: number;
  result: TradeResult;
  /** Payout percentage offered by the broker (e.g. 87 = 87%). */
  payoutPct: number | null;
  profitCents: number;
  /** True when the profit was typed by the user instead of computed. */
  profitIsManual: boolean;
  strategyId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amountCents: number;
  occurredAt: string;
  note: string;
  createdAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface UserSettings {
  currency: Currency;
  timezone: string;
  initialCapitalCents: number;
  defaultPayoutPct: number;
  maxStakeCents: number | null;
  riskPerTradePct: number | null;
  dailyLossLimitCents: number | null;
  dailyProfitGoalCents: number | null;
  weeklyProfitGoalCents: number | null;
  monthlyProfitGoalCents: number | null;
  maxTradesPerDay: number | null;
  maxConsecutiveLosses: number | null;
  maxDrawdownPct: number | null;
  maxDailyExposurePct: number | null;
  reducedMotion: boolean;
  smoothScroll: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  initialCapitalCents: 0,
  defaultPayoutPct: 85,
  maxStakeCents: null,
  riskPerTradePct: null,
  dailyLossLimitCents: null,
  dailyProfitGoalCents: null,
  weeklyProfitGoalCents: null,
  monthlyProfitGoalCents: null,
  maxTradesPerDay: null,
  maxConsecutiveLosses: null,
  maxDrawdownPct: null,
  maxDailyExposurePct: null,
  reducedMotion: false,
  smoothScroll: true,
};

export interface JournalEntry {
  id: string;
  /** Trading session date, YYYY-MM-DD in the user's timezone. */
  sessionDate: string;
  tradeId: string | null;
  emotion: Emotion;
  emotionNote: string;
  strategyId: string | null;
  followedPlan: PlanAdherence;
  impulsive: boolean;
  mainMistake: string;
  didRight: string;
  toImprove: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
