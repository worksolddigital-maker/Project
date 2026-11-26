import Papa from "papaparse";

/** Error with an HTTP-like status, mapped to API errors on the server and to messages in the browser. */
export class SheetError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 20000;
const MAX_COLS = 60;

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
  sheetName: string | null;
  truncated: boolean;
}

function decodeText(buffer: Uint8Array): string {
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
  if (!nonEmpty.length) throw new SheetError(422, "O arquivo não contém dados.");
  const [headerRow, ...rest] = nonEmpty;
  const width = Math.min(MAX_COLS, Math.max(headerRow.length, ...rest.slice(0, 200).map((r) => r.length)));
  const headers = Array.from({ length: width }, (_, i) => headerRow[i]?.trim() || `Coluna ${i + 1}`);
  const truncated = rest.length > MAX_ROWS;
  const rows = rest.slice(0, MAX_ROWS).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
  return { headers, rows, sheetName, truncated };
}

async function parseXlsx(buffer: Uint8Array): Promise<ParsedSheet> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new SheetError(422, "Não foi possível ler a planilha. Salve-a como .xlsx ou exporte em CSV.");
  }
  const sheet = wb.worksheets.find((ws) => ws.actualRowCount > 0);
  if (!sheet) throw new SheetError(422, "A planilha está vazia.");
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

function parseCsv(buffer: Uint8Array): ParsedSheet {
  const text = decodeText(buffer);
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy", delimiter: "" });
  if (result.errors.length && !result.data.length) throw new SheetError(422, "CSV inválido.");
  return finalize(
    result.data.map((r) => r.map((c) => String(c ?? "").trim())),
    null,
  );
}

/** Parses an uploaded CSV/XLSX file (as bytes) into a header row and string cells. Runs in Node and in the browser. */
export async function parseSheetBytes(fileName: string, bytes: Uint8Array): Promise<ParsedSheet> {
  if (bytes.byteLength === 0) throw new SheetError(422, "Arquivo vazio.");
  if (bytes.byteLength > MAX_IMPORT_BYTES) throw new SheetError(413, "Arquivo maior que 8 MB.");
  const name = fileName.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) return parseXlsx(bytes);
  if (name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv")) return parseCsv(bytes);
  if (name.endsWith(".xls")) {
    throw new SheetError(415, "Formato .xls antigo não suportado. Salve como .xlsx ou CSV.");
  }
  throw new SheetError(415, "Formato não suportado. Envie um arquivo .csv ou .xlsx.");
}
