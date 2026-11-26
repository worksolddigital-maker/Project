import type { TradeResult } from "./types";

export const MIN_PAYOUT_PCT = 1;
export const MAX_PAYOUT_PCT = 500;
export const MIN_EXPIRATION_SECONDS = 5;
export const MAX_EXPIRATION_SECONDS = 7 * 24 * 3600;

/**
 * Automatic profit for a binary-style trade:
 *  WIN  -> stake × payout%
 *  LOSS -> −stake
 *  DRAW -> 0 (stake refunded)
 */
export function computeProfitCents(result: TradeResult, stakeCents: number, payoutPct: number | null): number | null {
  if (result === "LOSS") return -stakeCents;
  if (result === "DRAW") return 0;
  if (payoutPct === null || !Number.isFinite(payoutPct)) return null;
  return Math.round((stakeCents * payoutPct) / 100);
}

export function returnPct(profitCents: number, stakeCents: number): number {
  if (stakeCents <= 0) return 0;
  return (profitCents / stakeCents) * 100;
}

/** Returns an error message if a manually informed profit is inconsistent with the result. */
export function validateManualProfit(result: TradeResult, stakeCents: number, profitCents: number): string | null {
  if (!Number.isInteger(profitCents)) return "Valor de lucro inválido.";
  if (result === "WIN" && profitCents <= 0) return "Uma operação WIN precisa ter lucro maior que zero.";
  if (result === "LOSS") {
    if (profitCents >= 0) return "Uma operação LOSS precisa ter resultado negativo.";
    if (-profitCents > stakeCents) return "O prejuízo não pode ser maior que o valor investido.";
  }
  if (result === "DRAW" && profitCents !== 0) return "Uma operação de EMPATE tem resultado zero.";
  return null;
}

export interface FinancialsInput {
  result: TradeResult;
  stakeCents: number;
  payoutPct: number | null;
  profitIsManual: boolean;
  profitCents?: number | null;
}

export type FinancialsOutcome =
  | { ok: true; profitCents: number; profitIsManual: boolean }
  | { ok: false; error: string; field: "payoutPct" | "profitCents" };

/** Single source of truth for how a trade's financial result is derived. */
export function resolveFinancials(input: FinancialsInput): FinancialsOutcome {
  const { result, stakeCents, payoutPct } = input;
  if (result === "DRAW") return { ok: true, profitCents: 0, profitIsManual: false };
  if (input.profitIsManual) {
    if (input.profitCents === null || input.profitCents === undefined) {
      return { ok: false, error: "Informe o lucro/prejuízo da operação.", field: "profitCents" };
    }
    const err = validateManualProfit(result, stakeCents, input.profitCents);
    if (err) return { ok: false, error: err, field: "profitCents" };
    return { ok: true, profitCents: input.profitCents, profitIsManual: true };
  }
  const auto = computeProfitCents(result, stakeCents, payoutPct);
  if (auto === null) {
    return { ok: false, error: "Informe o payout (%) para calcular o lucro da operação WIN.", field: "payoutPct" };
  }
  return { ok: true, profitCents: auto, profitIsManual: false };
}

export const EXPIRATION_PRESETS: { seconds: number; label: string }[] = [
  { seconds: 5, label: "5s" },
  { seconds: 15, label: "15s" },
  { seconds: 30, label: "30s" },
  { seconds: 60, label: "1 min" },
  { seconds: 120, label: "2 min" },
  { seconds: 180, label: "3 min" },
  { seconds: 300, label: "5 min" },
  { seconds: 600, label: "10 min" },
  { seconds: 900, label: "15 min" },
  { seconds: 1800, label: "30 min" },
  { seconds: 3600, label: "1 h" },
  { seconds: 14400, label: "4 h" },
  { seconds: 86400, label: "1 dia" },
];

export function formatExpiration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds % 86400 === 0) {
    const d = seconds / 86400;
    return d === 1 ? "1 dia" : `${d} dias`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s) parts.push(`${s}s`);
  return parts.join(" ");
}

/**
 * Parses expiration strings used by brokers and spreadsheets:
 * "30s", "1m", "1 min", "M5", "5", "00:01:00", "1h", "H1".
 * A bare number is interpreted as minutes.
 */
export function parseExpiration(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input <= 0) return null;
    return Math.round(input * 60);
  }
  const s = input.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/))) {
    const total = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    return total > 0 ? total : null;
  }
  if ((m = s.match(/^(\d{1,3}):(\d{2})$/))) {
    const total = Number(m[1]) * 60 + Number(m[2]);
    return total > 0 ? total : null;
  }
  if ((m = s.match(/^([mhsd])\s*(\d+(?:\.\d+)?)$/))) {
    return unitToSeconds(Number(m[2]), m[1]);
  }
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(s|seg|segs|segundos?|sec|secs|seconds?|m|min|mins|minutos?|minutes?|h|hr|hrs|horas?|hours?|d|dias?|days?)?$/))) {
    const value = Number(m[1]);
    const unit = m[2] ?? "m";
    return unitToSeconds(value, unit[0]);
  }
  return null;
}

function unitToSeconds(value: number, unit: string): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : null;
  if (mult === null) return null;
  return Math.round(value * mult);
}

/** Normalises asset tickers: trims, collapses spaces, upper-cases. */
export function normalizeAsset(asset: string): string {
  return asset
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
    .replace(/\(OTC\)/, "(OTC)");
}

export const COMMON_ASSETS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "USD/CHF",
  "EUR/JPY",
  "EUR/GBP",
  "GBP/JPY",
  "NZD/USD",
  "EUR/USD (OTC)",
  "GBP/USD (OTC)",
  "USD/JPY (OTC)",
  "BTC/USD",
  "ETH/USD",
  "XAU/USD",
];
