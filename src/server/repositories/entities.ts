import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { CashMovement, JournalEntry, Strategy, UserSettings } from "@/lib/domain/types";
import type { CashMovementInput, JournalInput, SettingsUpdate } from "@/lib/validation/schemas";
import type { Db } from "@/server/db/client";
import { cashMovements, journalEntries, strategies, trades, userSettings } from "@/server/db/schema";
import { ApiError } from "@/server/http";
import { toCash, toJournal, toSettings, toStrategy } from "./mappers";

/* --------------------------------- Settings -------------------------------- */

export async function getSettings(db: Db, userId: string): Promise<UserSettings> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return toSettings(row);
}

export async function updateSettings(db: Db, userId: string, patch: SettingsUpdate): Promise<UserSettings> {
  const values = { ...patch, updatedAt: new Date() };
  if (values.defaultPayoutPct !== undefined) values.defaultPayoutPct = Math.round(values.defaultPayoutPct * 100) / 100;
  await db
    .insert(userSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userSettings.userId, set: values });
  return getSettings(db, userId);
}

/* ------------------------------ Cash movements ----------------------------- */

export async function listCash(db: Db, userId: string): Promise<CashMovement[]> {
  const rows = await db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.userId, userId))
    .orderBy(desc(cashMovements.occurredAt), desc(cashMovements.createdAt));
  return rows.map(toCash);
}

const cashValues = (input: CashMovementInput) => ({
  type: input.type,
  amountCents: input.amountCents,
  occurredAt: new Date(input.occurredAt),
  note: input.note,
});

export async function createCash(db: Db, userId: string, input: CashMovementInput): Promise<CashMovement> {
  const [row] = await db.insert(cashMovements).values({ ...cashValues(input), userId }).returning();
  return toCash(row);
}

export async function updateCash(db: Db, userId: string, id: string, input: CashMovementInput): Promise<CashMovement> {
  const [row] = await db
    .update(cashMovements)
    .set(cashValues(input))
    .where(and(eq(cashMovements.id, id), eq(cashMovements.userId, userId)))
    .returning();
  if (!row) throw new ApiError(404, "Movimentação não encontrada.");
  return toCash(row);
}

export async function deleteCash(db: Db, userId: string, id: string): Promise<CashMovement> {
  const [row] = await db
    .delete(cashMovements)
    .where(and(eq(cashMovements.id, id), eq(cashMovements.userId, userId)))
    .returning();
  if (!row) throw new ApiError(404, "Movimentação não encontrada.");
  return toCash(row);
}

/* -------------------------------- Strategies ------------------------------- */

export async function listStrategies(db: Db, userId: string): Promise<Strategy[]> {
  const rows = await db.select().from(strategies).where(eq(strategies.userId, userId)).orderBy(strategies.name);
  return rows.map(toStrategy);
}

async function assertUniqueStrategyName(db: Db, userId: string, name: string, exceptId?: string) {
  const rows = await db
    .select({ id: strategies.id })
    .from(strategies)
    .where(and(eq(strategies.userId, userId), sql`lower(${strategies.name}) = lower(${name})`));
  if (rows.some((r) => r.id !== exceptId)) {
    throw new ApiError(409, "Já existe uma estratégia com esse nome.", { name: "Já existe uma estratégia com esse nome." });
  }
}

export async function createStrategy(db: Db, userId: string, input: { name: string; description: string }): Promise<Strategy> {
  await assertUniqueStrategyName(db, userId, input.name);
  const [row] = await db.insert(strategies).values({ ...input, userId }).returning();
  return toStrategy(row);
}

export async function updateStrategy(
  db: Db,
  userId: string,
  id: string,
  input: { name: string; description: string },
): Promise<Strategy> {
  await assertUniqueStrategyName(db, userId, input.name, id);
  const [row] = await db
    .update(strategies)
    .set(input)
    .where(and(eq(strategies.id, id), eq(strategies.userId, userId)))
    .returning();
  if (!row) throw new ApiError(404, "Estratégia não encontrada.");
  return toStrategy(row);
}

export async function deleteStrategy(db: Db, userId: string, id: string): Promise<Strategy> {
  const [row] = await db
    .delete(strategies)
    .where(and(eq(strategies.id, id), eq(strategies.userId, userId)))
    .returning();
  if (!row) throw new ApiError(404, "Estratégia não encontrada.");
  return toStrategy(row);
}

/* --------------------------------- Journal --------------------------------- */

export async function listJournal(db: Db, userId: string): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.sessionDate), desc(journalEntries.createdAt));
  return rows.map(toJournal);
}

async function assertJournalRefs(db: Db, userId: string, input: JournalInput) {
  if (input.tradeId) {
    const t = await db
      .select({ id: trades.id })
      .from(trades)
      .where(and(eq(trades.id, input.tradeId), eq(trades.userId, userId)))
      .limit(1);
    if (!t.length) throw new ApiError(422, "Operação vinculada não encontrada.", { tradeId: "Operação não encontrada." });
  }
  if (input.strategyId) {
    const s = await db
      .select({ id: strategies.id })
      .from(strategies)
      .where(and(eq(strategies.id, input.strategyId), eq(strategies.userId, userId)))
      .limit(1);
    if (!s.length) throw new ApiError(422, "Estratégia não encontrada.", { strategyId: "Estratégia não encontrada." });
  }
}

export async function createJournal(db: Db, userId: string, input: JournalInput): Promise<JournalEntry> {
  await assertJournalRefs(db, userId, input);
  const [row] = await db.insert(journalEntries).values({ ...input, userId }).returning();
  return toJournal(row);
}

export async function updateJournal(db: Db, userId: string, id: string, input: JournalInput): Promise<JournalEntry> {
  await assertJournalRefs(db, userId, input);
  const [row] = await db
    .update(journalEntries)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  if (!row) throw new ApiError(404, "Anotação não encontrada.");
  return toJournal(row);
}

export async function deleteJournal(db: Db, userId: string, id: string): Promise<JournalEntry> {
  const [row] = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  if (!row) throw new ApiError(404, "Anotação não encontrada.");
  return toJournal(row);
}
