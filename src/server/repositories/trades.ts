import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { normalizeAsset, resolveFinancials } from "@/lib/domain/trade-calc";
import type { Trade } from "@/lib/domain/types";
import type { TradeInput } from "@/lib/validation/schemas";
import type { Db } from "@/server/db/client";
import { strategies, trades } from "@/server/db/schema";
import { ApiError } from "@/server/http";
import { toTrade } from "./mappers";

async function assertStrategy(db: Db, userId: string, strategyId: string | null) {
  if (!strategyId) return;
  const found = await db
    .select({ id: strategies.id })
    .from(strategies)
    .where(and(eq(strategies.id, strategyId), eq(strategies.userId, userId)))
    .limit(1);
  if (!found.length) throw new ApiError(422, "Estratégia não encontrada.", { strategyId: "Estratégia não encontrada." });
}

function toValues(input: TradeInput) {
  const fin = resolveFinancials(input);
  if (!fin.ok) throw new ApiError(422, fin.error, { [fin.field]: fin.error });
  return {
    executedAt: new Date(input.executedAt),
    asset: normalizeAsset(input.asset),
    direction: input.direction,
    stakeCents: input.stakeCents,
    expirationSeconds: input.expirationSeconds,
    result: input.result,
    payoutPct: input.payoutPct === null ? null : Math.round(input.payoutPct * 100) / 100,
    profitCents: fin.profitCents,
    profitIsManual: fin.profitIsManual,
    strategyId: input.strategyId,
    notes: input.notes,
  };
}

export async function listTrades(db: Db, userId: string): Promise<Trade[]> {
  const rows = await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.executedAt), desc(trades.createdAt));
  return rows.map(toTrade);
}

export async function createTrade(db: Db, userId: string, input: TradeInput): Promise<Trade> {
  await assertStrategy(db, userId, input.strategyId);
  const [row] = await db
    .insert(trades)
    .values({ ...toValues(input), userId })
    .returning();
  return toTrade(row);
}

export async function updateTrade(db: Db, userId: string, id: string, input: TradeInput): Promise<Trade> {
  await assertStrategy(db, userId, input.strategyId);
  const [row] = await db
    .update(trades)
    .set({ ...toValues(input), updatedAt: new Date() })
    .where(and(eq(trades.id, id), eq(trades.userId, userId)))
    .returning();
  if (!row) throw new ApiError(404, "Operação não encontrada.");
  return toTrade(row);
}

export async function deleteTrade(db: Db, userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(trades)
    .where(and(eq(trades.id, id), eq(trades.userId, userId)))
    .returning({ id: trades.id });
  if (!deleted.length) throw new ApiError(404, "Operação não encontrada.");
}

export async function deleteAllTrades(db: Db, userId: string): Promise<number> {
  const deleted = await db.delete(trades).where(eq(trades.userId, userId)).returning({ id: trades.id });
  return deleted.length;
}

export async function countTrades(db: Db, userId: string): Promise<number> {
  const [r] = await db.select({ c: sql<number>`count(*)::int` }).from(trades).where(eq(trades.userId, userId));
  return Number(r?.c ?? 0);
}
