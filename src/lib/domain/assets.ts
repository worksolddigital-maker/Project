/**
 * Asset catalog as listed by the broker's asset selector (Hezilex trade room),
 * with the payout ("Lucro") shown there. Payouts change during the day, so these
 * are reference values: each profile can override them in Configurações.
 */

export const ASSET_CATEGORIES = ["cripto", "forex", "acoes", "commodities"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  cripto: "Cripto",
  forex: "Forex",
  acoes: "Ações",
  commodities: "Commodities",
};

export interface AssetInfo {
  symbol: string;
  category: AssetCategory;
  /** Payout shown by the broker when the catalog was captured; null when it was not visible. */
  payoutPct: number | null;
}

/** Date the payouts below were read from the broker. */
export const CATALOG_CAPTURED_AT = "2026-11-25";

const crypto = (symbol: string, payoutPct: number | null): AssetInfo => ({ symbol, category: "cripto", payoutPct });
const fx = (symbol: string, payoutPct: number | null): AssetInfo => ({ symbol, category: "forex", payoutPct });
const commodity = (symbol: string, payoutPct: number | null): AssetInfo => ({ symbol, category: "commodities", payoutPct });

export const ASSET_CATALOG: readonly AssetInfo[] = [
  // Cripto
  crypto("BITCOIN", 82),
  crypto("BTC/USD", 82),
  crypto("ETHEREUM", 82),
  crypto("BNB", 87),
  crypto("CARDANO", 87),
  crypto("XRP", 82),
  crypto("DOGE", 82),
  crypto("AVAX", 80),
  crypto("SUI", 80),
  crypto("LINK", 80),
  crypto("XPL", 80),
  crypto("STELLAR", 80),
  // Forex
  fx("EUR/USD", 88),
  fx("EUR/CAD", 90),
  fx("AUD/NZD", 89),
  fx("NZD/CAD", 89),
  fx("CAD/CHF", 88),
  fx("GBP/USD", 87),
  fx("AUD/CAD", 87),
  fx("CAD/JPY", 87),
  fx("CHF/JPY", 87),
  fx("GBP/CHF", 87),
  fx("GBP/AUD", 87),
  fx("USD/CAD", 85),
  fx("NZD/USD", 85),
  fx("USD/CHF", 85),
  fx("NZD/JPY", 85),
  fx("EUR/CHF", 85),
  fx("AUD/USD", 85),
  fx("NZD/CHF", 85),
  fx("GBP/CAD", 85),
  fx("GBP/NZD", 85),
  fx("AUD/JPY", 84),
  fx("USD/JPY", 84),
  fx("EUR/GBP", 83),
  fx("EUR/JPY", 82),
  fx("GBP/JPY", 82),
  fx("USD/AUD", 80),
  fx("EUR/NZD", null),
  fx("AUD/CHF", null),
  fx("EUR/AUD", null),
  // Commodities
  commodity("COBRE", 98),
  commodity("PETRÓLEO", 82),
  commodity("PRATA", 82),
  commodity("OURO", 82),
];

const BY_SYMBOL = new Map(ASSET_CATALOG.map((a) => [a.symbol, a]));

export function findAsset(symbol: string): AssetInfo | undefined {
  return BY_SYMBOL.get(symbol.trim().toUpperCase());
}

export interface AssetPrefs {
  /** Payout overrides typed by the account owner, by symbol. */
  payouts: Record<string, number>;
  favorites: string[];
}

export const EMPTY_ASSET_PREFS: AssetPrefs = { payouts: {}, favorites: [] };

/** Payout to suggest for an asset: the account's override, else the broker reference. */
export function suggestedPayout(symbol: string, prefs: AssetPrefs | undefined): number | null {
  const key = symbol.trim().toUpperCase();
  const override = prefs?.payouts?.[key];
  if (typeof override === "number") return override;
  return findAsset(key)?.payoutPct ?? null;
}

/** Short label for an asset badge: "EUR/USD" -> ["EUR", "USD"], "BITCOIN" -> ["BI"]. */
export function assetMonogram(symbol: string): string[] {
  const s = symbol.trim().toUpperCase();
  if (s.includes("/")) return s.split("/").slice(0, 2).map((p) => p.slice(0, 3));
  return [s.replace(/[^A-ZÀ-Ú]/g, "").slice(0, 2)];
}
