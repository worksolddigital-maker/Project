import "server-only";
import { eq, sql } from "drizzle-orm";
import { tradeSignature, type ImportedTrade } from "@/lib/domain/import-mapping";
import { MAX_IMPORT_BYTES, parseSheetBytes, SheetError, type ParsedSheet } from "@/lib/import/parse-sheet";
import type { Db } from "@/server/db/client";
import { strategies, trades } from "@/server/db/schema";
import { ApiError } from "@/server/http";

export { MAX_IMPORT_BYTES };

export async function parseImportFile(file: File): Promise<ParsedSheet> {
  if (file.size === 0) throw new ApiError(422, "Arquivo vazio.");
  if (file.size > MAX_IMPORT_BYTES) throw new ApiError(413, "Arquivo maior que 8 MB.");
  try {
    return await parseSheetBytes(file.name, new Uint8Array(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof SheetError) throw new ApiError(err.status, err.message);
    throw err;
  }
}

export interface ImportResult {
  inserted: number;
  duplicates: number;
  strategiesCreated: number;
}

export async function commitImport(
  db: Db,
  userId: string,
  rows: ImportedTrade[],
  skipDuplicates: boolean,
): Promise<ImportResult> {
  return db.transaction(async (tx) => {
    // Resolve strategies by name (case-insensitive), creating the missing ones.
    const existing = await tx.select().from(strategies).where(eq(strategies.userId, userId));
    const byName = new Map(existing.map((s) => [s.name.toLowerCase(), s.id]));
    let strategiesCreated = 0;
    for (const name of new Set(rows.map((r) => r.strategyName?.trim()).filter(Boolean) as string[])) {
      if (byName.has(name.toLowerCase())) continue;
      const [created] = await tx.insert(strategies).values({ userId, name, description: "" }).returning();
      byName.set(name.toLowerCase(), created.id);
      strategiesCreated++;
    }

    const seen = new Set<string>();
    if (skipDuplicates) {
      const current = await tx
        .select({
          executedAt: trades.executedAt,
          asset: trades.asset,
          direction: trades.direction,
          stakeCents: trades.stakeCents,
          result: trades.result,
          profitCents: trades.profitCents,
        })
        .from(trades)
        .where(eq(trades.userId, userId));
      for (const t of current) {
        seen.add(
          tradeSignature({
            ...t,
            executedAt: t.executedAt.toISOString(),
            stakeCents: Number(t.stakeCents),
            profitCents: Number(t.profitCents),
          }),
        );
      }
    }

    let duplicates = 0;
    const values: (typeof trades.$inferInsert)[] = [];
    for (const r of rows) {
      if (skipDuplicates) {
        const sig = tradeSignature(r);
        if (seen.has(sig)) {
          duplicates++;
          continue;
        }
        seen.add(sig);
      }
      values.push({
        userId,
        executedAt: new Date(r.executedAt),
        asset: r.asset,
        direction: r.direction,
        stakeCents: r.stakeCents,
        expirationSeconds: r.expirationSeconds,
        result: r.result,
        payoutPct: r.payoutPct,
        profitCents: r.profitCents,
        profitIsManual: r.profitIsManual,
        strategyId: r.strategyName ? byName.get(r.strategyName.trim().toLowerCase()) ?? null : null,
        notes: r.notes,
      });
    }
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(trades).values(values.slice(i, i + 500));
    }
    return { inserted: values.length, duplicates, strategiesCreated };
  });
}

/** Used by tests and diagnostics. */
export async function tradeCount(db: Db, userId: string) {
  const [r] = await db.select({ c: sql<number>`count(*)::int` }).from(trades).where(eq(trades.userId, userId));
  return Number(r.c);
}
