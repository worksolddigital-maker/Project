import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const money = (name: string) => bigint(name, { mode: "number" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token: a DB leak does not expose usable tokens. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("BRL"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  initialCapitalCents: money("initial_capital_cents").notNull().default(0),
  defaultPayoutPct: doublePrecision("default_payout_pct").notNull().default(85),
  maxStakeCents: money("max_stake_cents"),
  riskPerTradePct: doublePrecision("risk_per_trade_pct"),
  dailyLossLimitCents: money("daily_loss_limit_cents"),
  dailyProfitGoalCents: money("daily_profit_goal_cents"),
  weeklyProfitGoalCents: money("weekly_profit_goal_cents"),
  monthlyProfitGoalCents: money("monthly_profit_goal_cents"),
  maxTradesPerDay: integer("max_trades_per_day"),
  maxConsecutiveLosses: integer("max_consecutive_losses"),
  maxDrawdownPct: doublePrecision("max_drawdown_pct"),
  maxDailyExposurePct: doublePrecision("max_daily_exposure_pct"),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  smoothScroll: boolean("smooth_scroll").notNull().default(true),
  updatedAt: updatedAt(),
});

export const strategies = pgTable(
  "strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("strategies_user_name_unique").on(t.userId, sql`lower(${t.name})`)],
);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    executedAt: timestamp("executed_at", { withTimezone: true, mode: "date" }).notNull(),
    asset: text("asset").notNull(),
    direction: text("direction").notNull(),
    stakeCents: money("stake_cents").notNull(),
    expirationSeconds: integer("expiration_seconds").notNull(),
    result: text("result").notNull(),
    payoutPct: doublePrecision("payout_pct"),
    profitCents: money("profit_cents").notNull(),
    profitIsManual: boolean("profit_is_manual").notNull().default(false),
    strategyId: uuid("strategy_id").references(() => strategies.id, { onDelete: "set null" }),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("trades_user_executed_idx").on(t.userId, t.executedAt),
    check("trades_direction_check", sql`${t.direction} in ('CALL', 'PUT')`),
    check("trades_result_check", sql`${t.result} in ('WIN', 'LOSS', 'DRAW')`),
    check("trades_stake_positive", sql`${t.stakeCents} > 0`),
  ],
);

export const cashMovements = pgTable(
  "cash_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amountCents: money("amount_cents").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [
    index("cash_movements_user_idx").on(t.userId, t.occurredAt),
    check("cash_movements_type_check", sql`${t.type} in ('DEPOSIT', 'WITHDRAWAL')`),
    check("cash_movements_amount_positive", sql`${t.amountCents} > 0`),
  ],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionDate: date("session_date", { mode: "string" }).notNull(),
    tradeId: uuid("trade_id").references(() => trades.id, { onDelete: "set null" }),
    emotion: text("emotion").notNull(),
    emotionNote: text("emotion_note").notNull().default(""),
    strategyId: uuid("strategy_id").references(() => strategies.id, { onDelete: "set null" }),
    followedPlan: text("followed_plan").notNull(),
    impulsive: boolean("impulsive").notNull().default(false),
    mainMistake: text("main_mistake").notNull().default(""),
    didRight: text("did_right").notNull().default(""),
    toImprove: text("to_improve").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("journal_user_date_idx").on(t.userId, t.sessionDate)],
);
