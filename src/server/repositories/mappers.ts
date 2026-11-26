import "server-only";
import type { CashMovement, JournalEntry, Strategy, Trade, UserSettings } from "@/lib/domain/types";
import { DEFAULT_SETTINGS } from "@/lib/domain/types";
import type { cashMovements, journalEntries, strategies, trades, userSettings } from "@/server/db/schema";

type TradeRow = typeof trades.$inferSelect;
type CashRow = typeof cashMovements.$inferSelect;
type StrategyRow = typeof strategies.$inferSelect;
type JournalRow = typeof journalEntries.$inferSelect;
type SettingsRow = typeof userSettings.$inferSelect;

export const toTrade = (r: TradeRow): Trade => ({
  id: r.id,
  executedAt: r.executedAt.toISOString(),
  asset: r.asset,
  direction: r.direction as Trade["direction"],
  stakeCents: Number(r.stakeCents),
  expirationSeconds: r.expirationSeconds,
  result: r.result as Trade["result"],
  payoutPct: r.payoutPct,
  profitCents: Number(r.profitCents),
  profitIsManual: r.profitIsManual,
  strategyId: r.strategyId,
  notes: r.notes,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const toCash = (r: CashRow): CashMovement => ({
  id: r.id,
  type: r.type as CashMovement["type"],
  amountCents: Number(r.amountCents),
  occurredAt: r.occurredAt.toISOString(),
  note: r.note,
  createdAt: r.createdAt.toISOString(),
});

export const toStrategy = (r: StrategyRow): Strategy => ({
  id: r.id,
  name: r.name,
  description: r.description,
  createdAt: r.createdAt.toISOString(),
});

export const toJournal = (r: JournalRow): JournalEntry => ({
  id: r.id,
  sessionDate: r.sessionDate,
  tradeId: r.tradeId,
  emotion: r.emotion as JournalEntry["emotion"],
  emotionNote: r.emotionNote,
  strategyId: r.strategyId,
  followedPlan: r.followedPlan as JournalEntry["followedPlan"],
  impulsive: r.impulsive,
  mainMistake: r.mainMistake,
  didRight: r.didRight,
  toImprove: r.toImprove,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const n = (v: number | null) => (v === null ? null : Number(v));

export const toSettings = (r: SettingsRow | undefined): UserSettings =>
  r
    ? {
        currency: r.currency as UserSettings["currency"],
        timezone: r.timezone,
        initialCapitalCents: Number(r.initialCapitalCents),
        defaultPayoutPct: r.defaultPayoutPct,
        maxStakeCents: n(r.maxStakeCents),
        riskPerTradePct: r.riskPerTradePct,
        dailyLossLimitCents: n(r.dailyLossLimitCents),
        dailyProfitGoalCents: n(r.dailyProfitGoalCents),
        weeklyProfitGoalCents: n(r.weeklyProfitGoalCents),
        monthlyProfitGoalCents: n(r.monthlyProfitGoalCents),
        maxTradesPerDay: r.maxTradesPerDay,
        maxConsecutiveLosses: r.maxConsecutiveLosses,
        maxDrawdownPct: r.maxDrawdownPct,
        maxDailyExposurePct: r.maxDailyExposurePct,
        reducedMotion: r.reducedMotion,
        smoothScroll: r.smoothScroll,
      }
    : { ...DEFAULT_SETTINGS };
