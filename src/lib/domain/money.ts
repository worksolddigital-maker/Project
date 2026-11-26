import type { Currency } from "./types";

const MAX_CENTS = 100_000_000_000; // 1 billion in major units

/**
 * Parses a human typed money amount into integer cents.
 * Accepts pt-BR ("1.234,56"), en-US ("1,234.56"), plain ("1234.5"),
 * currency symbols, spaces and accounting negatives "(10,00)".
 * Returns null when the input cannot be parsed.
 */
export function parseMoneyToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    const cents = Math.round(input * 100);
    return Math.abs(cents) > MAX_CENTS ? null : cents;
  }
  let s = String(input).trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/R\$|US\$|\$|€|BRL|USD|EUR/gi, "").replace(/[\s ]/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // Both separators: the right-most one is the decimal separator.
    if (lastComma > lastDot) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const commaCount = s.split(",").length - 1;
    if (commaCount > 1) {
      normalized = s.replace(/,/g, "");
    } else {
      // pt-BR context: a single comma is always the decimal separator.
      normalized = s.replace(",", ".");
    }
  } else if (lastDot !== -1) {
    const dotCount = s.split(".").length - 1;
    const decimals = s.length - lastDot - 1;
    if (dotCount > 1) {
      normalized = s.replace(/\./g, "");
    } else if (decimals === 3) {
      // "1.234" in pt-BR means one thousand two hundred thirty four.
      normalized = s.replace(".", "");
    } else {
      normalized = s;
    }
  } else {
    normalized = s;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const [intPart, decPart = ""] = normalized.split(".");
  // Round half up on the third decimal using string arithmetic (no float error).
  const padded = (decPart + "000").slice(0, 3);
  let cents = Number(intPart) * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) cents += 1;
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return negative ? -cents : cents;
}

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  BRL: "pt-BR",
  USD: "pt-BR",
  EUR: "pt-BR",
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: Currency, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 1 : 2,
    });
    formatterCache.set(key, f);
  }
  return f;
}

export interface FormatMoneyOptions {
  /** Prefix positive values with "+". */
  signed?: boolean;
  compact?: boolean;
}

export function formatMoney(cents: number, currency: Currency = "BRL", opts: FormatMoneyOptions = {}): string {
  const value = cents / 100;
  const formatted = getFormatter(currency, !!opts.compact).format(Math.abs(value));
  if (cents < 0) return `−${formatted}`;
  if (opts.signed && cents > 0) return `+${formatted}`;
  return formatted;
}

/** Formats cents for an editable text input: 123456 -> "1234,56". */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const str = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
  return negative ? `-${str}` : str;
}

const pctFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pctFormatter2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatPct(value: number | null | undefined, opts: { signed?: boolean; digits?: 1 | 2 } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const f = opts.digits === 2 ? pctFormatter2 : pctFormatter;
  const abs = f.format(Math.abs(value));
  if (value < 0 && Number(abs.replace(",", ".")) !== 0) return `−${abs}%`;
  if (opts.signed && value > 0) return `+${abs}%`;
  return `${abs}%`;
}

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return numberFormatter.format(value);
}

/** Parses a percentage typed by the user ("87", "87,5", "87.5%"). */
export function parsePercent(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const s = input.trim().replace("%", "").replace(/\s/g, "").replace(",", ".");
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Integer-safe sum. */
export function sumCents(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function currencySymbol(currency: Currency): string {
  return currency === "BRL" ? "R$" : currency === "USD" ? "US$" : "€";
}
