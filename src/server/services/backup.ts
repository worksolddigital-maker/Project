import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { BACKUP_FORMAT, type Backup } from "@/lib/validation/schemas";
import type { Db } from "@/server/db/client";
import { cashMovements, journalEntries, strategies, trades, userSettings } from "@/server/db/schema";
import { getSettings, listCash, listJournal, listStrategies } from "@/server/repositories/entities";
import { listTrades } from "@/server/repositories/trades";

export async function exportBackup(db: Db, userId: string): Promise<Backup> {
  const [settings, strategyList, tradeList, cash, journal] = await Promise.all([
    getSettings(db, userId),
    listStrategies(db, userId),
    listTrades(db, userId),
    listCash(db, userId),
    listJournal(db, userId),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    strategies: strategyList,
    trades: tradeList,
    cashMovements: cash,
    journal,
  };
}

/**
 * Replaces all of the user's data with the backup content.
 * New ids are generated so a backup can be restored into any account.
 */
export async function restoreBackup(db: Db, userId: string, backup: Backup) {
  return db.transaction(async (tx) => {
    await tx.delete(journalEntries).where(eq(journalEntries.userId, userId));
    await tx.delete(trades).where(eq(trades.userId, userId));
    await tx.delete(cashMovements).where(eq(cashMovements.userId, userId));
    await tx.delete(strategies).where(eq(strategies.userId, userId));

    const { reducedMotion, smoothScroll, ...rest } = backup.settings;
    const settingsValues = { ...rest, reducedMotion, smoothScroll, updatedAt: new Date() };
    await tx
      .insert(userSettings)
      .values({ userId, ...settingsValues })
      .onConflictDoUpdate({ target: userSettings.userId, set: settingsValues });

    const strategyIds = new Map<string, string>();
    const seenNames = new Set<string>();
    for (const s of backup.strategies) {
      const key = s.name.trim().toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      const id = randomUUID();
      strategyIds.set(s.id, id);
      await tx.insert(strategies).values({ id, userId, name: s.name.trim(), description: s.description, createdAt: new Date(s.createdAt) });
    }

    const tradeIds = new Map<string, string>();
    const tradeRows = backup.trades.map((t) => {
      const id = randomUUID();
      tradeIds.set(t.id, id);
      return {
        id,
        userId,
        executedAt: new Date(t.executedAt),
        asset: t.asset,
        direction: t.direction,
        stakeCents: t.stakeCents,
        expirationSeconds: t.expirationSeconds,
        result: t.result,
        payoutPct: t.payoutPct,
        profitCents: t.profitCents,
        profitIsManual: t.profitIsManual,
        strategyId: t.strategyId ? strategyIds.get(t.strategyId) ?? null : null,
        notes: t.notes,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      };
    });
    for (let i = 0; i < tradeRows.length; i += 500) await tx.insert(trades).values(tradeRows.slice(i, i + 500));

    const cashRows = backup.cashMovements.map((c) => ({
      userId,
      type: c.type,
      amountCents: c.amountCents,
      occurredAt: new Date(c.occurredAt),
      note: c.note,
      createdAt: new Date(c.createdAt),
    }));
    for (let i = 0; i < cashRows.length; i += 500) await tx.insert(cashMovements).values(cashRows.slice(i, i + 500));

    const journalRows = backup.journal.map((j) => ({
      userId,
      sessionDate: j.sessionDate,
      tradeId: j.tradeId ? tradeIds.get(j.tradeId) ?? null : null,
      emotion: j.emotion,
      emotionNote: j.emotionNote,
      strategyId: j.strategyId ? strategyIds.get(j.strategyId) ?? null : null,
      followedPlan: j.followedPlan,
      impulsive: j.impulsive,
      mainMistake: j.mainMistake,
      didRight: j.didRight,
      toImprove: j.toImprove,
      createdAt: new Date(j.createdAt),
      updatedAt: new Date(j.updatedAt),
    }));
    for (let i = 0; i < journalRows.length; i += 500) await tx.insert(journalEntries).values(journalRows.slice(i, i + 500));

    return {
      trades: tradeRows.length,
      cashMovements: cashRows.length,
      strategies: strategyIds.size,
      journal: journalRows.length,
    };
  });
}
