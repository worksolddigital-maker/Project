import "server-only";
import { eq, sql } from "drizzle-orm";
import Papa from "papaparse";
import { tradeSignature, type ImportedTrade } from "@/lib/domain/import-mapping";
import type { Db } from "@/server/db/client";
import { strategies, trades } from "@/server/db/schema";
import { ApiError } from "@/server/http";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 20000;
const MAX_COLS = 60;

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
  sheetName: string | null;
  truncated: boolean;
}

function decodeText(buffer: Buffer): string {
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("�")) {
    // Excel in pt-BR commonly saves CSV as Windows-1252.
    text = new TextDecoder("windows-1252").decode(buffer);
  }
  return text.replace(/^﻿/, "");
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function numberToCell(v: number): string {
  if (!Number.isFinite(v)) return "";
  if (Number.isInteger(v)) return String(v);
  // Comma decimal keeps parsing unambiguous in pt-BR aware parsers.
  return v.toFixed(6).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

function excelValueToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return numberToCell(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const time = `${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`;
    if (value.getUTCFullYear() <= 1900 && value.getUTCMonth() === 11 && value.getUTCDate() >= 30) return time;
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())} ${time}`;
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) return (v.richText as { text: string }[]).map((r) => r.text).join("").trim();
    if ("result" in v) return excelValueToString(v.result);
    if ("text" in v) return excelValueToString(v.text);
    if ("error" in v) return "";
  }
  return String(value).trim();
}

function finalize(table: string[][], sheetName: string | null): ParsedSheet {
  const nonEmpty = table.filter((r) => r.some((c) => c !== ""));
  if (!nonEmpty.length) throw new ApiError(422, "O arquivo não contém dados.");
  const [headerRow, ...rest] = nonEmpty;
  const width = Math.min(MAX_COLS, Math.max(headerRow.length, ...rest.slice(0, 200).map((r) => r.length)));
  const headers = Array.from({ length: width }, (_, i) => headerRow[i]?.trim() || `Coluna ${i + 1}`);
  const truncated = rest.length > MAX_ROWS;
  const rows = rest.slice(0, MAX_ROWS).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
  return { headers, rows, sheetName, truncated };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedSheet> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new ApiError(422, "Não foi possível ler a planilha. Salve-a como .xlsx ou exporte em CSV.");
  }
  const sheet = wb.worksheets.find((ws) => ws.actualRowCount > 0);
  if (!sheet) throw new ApiError(422, "A planilha está vazia.");
  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    if (table.length > MAX_ROWS + 1) return;
    const values = row.values as unknown[];
    const cells: string[] = [];
    for (let i = 1; i < Math.min(values.length, MAX_COLS + 1); i++) cells.push(excelValueToString(values[i]));
    table.push(cells);
  });
  return finalize(table, sheet.name);
}

function parseCsv(buffer: Buffer): ParsedSheet {
  const text = decodeText(buffer);
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy", delimiter: "" });
  if (result.errors.length && !result.data.length) throw new ApiError(422, "CSV inválido.");
  return finalize(
    result.data.map((r) => r.map((c) => String(c ?? "").trim())),
    null,
  );
}

export async function parseImportFile(file: File): Promise<ParsedSheet> {
  if (file.size === 0) throw new ApiError(422, "Arquivo vazio.");
  if (file.size > MAX_IMPORT_BYTES) throw new ApiError(413, "Arquivo maior que 8 MB.");
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) return parseXlsx(buffer);
  if (name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv")) return parseCsv(buffer);
  if (name.endsWith(".xls")) {
    throw new ApiError(415, "Formato .xls antigo não suportado. Salve como .xlsx ou CSV.");
  }
  throw new ApiError(415, "Formato não suportado. Envie um arquivo .csv ou .xlsx.");
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
