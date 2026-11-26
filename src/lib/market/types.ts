/** Market panel data shared by the server, the demo and the UI. */

export const QUOTE_CATEGORIES = ["indice", "acao", "cambio", "cripto", "juros"] as const;
export type QuoteCategory = (typeof QUOTE_CATEGORIES)[number];

export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  indice: "Índices",
  acao: "Ações B3",
  cambio: "Câmbio",
  cripto: "Cripto",
  juros: "Juros",
};

export interface Quote {
  /** Stable key, e.g. "IBOV", "PETR4", "USD/BRL", "BTC". */
  symbol: string;
  name: string;
  category: QuoteCategory;
  price: number;
  /** Currency of `price` ("BRL", "USD"), or "%" for rates, "" for plain ratios. */
  unit: string;
  /** Percent change over `changeLabel`; null when the source gives no reference. */
  changePct: number | null;
  /** What the change is measured against ("em 24 h", "no dia"...). */
  changeLabel: string;
  /** When the source last updated this value. */
  updatedAt: string;
  sourceId: string;
  /** Short provenance line shown under the value (delays, reference rates...). */
  note: string;
  /** Recent values for a sparkline (oldest first; may be empty). */
  spark: number[];
  /** Period the sparkline covers ("hoje", "7 dias"...). */
  sparkLabel: string;
  /** Regular expressions (normalized text) that tie news to this asset. */
  keywords: string[];
}

export const NEWS_TOPICS = ["bolsa", "cambio", "juros", "exterior", "commodities", "cripto", "empresas"] as const;
export type NewsTopic = (typeof NEWS_TOPICS)[number];

export const NEWS_TOPIC_LABELS: Record<NewsTopic, string> = {
  bolsa: "Bolsa",
  cambio: "Dólar e câmbio",
  juros: "Juros e economia",
  exterior: "Exterior",
  commodities: "Commodities",
  cripto: "Cripto",
  empresas: "Empresas",
};

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  /** Publisher name as shown to the reader. */
  source: string;
  /** Feed it came from (e.g. "Google Notícias"). */
  via: string;
  publishedAt: string;
  topics: NewsTopic[];
}

export interface SourceStatus {
  id: string;
  label: string;
  kind: "cotacoes" | "noticias";
  ok: boolean;
  count: number;
  /** Set when the last refresh failed (older data may still be shown). */
  error?: string;
  updatedAt: string | null;
}

export interface MarketSnapshot {
  quotes: Quote[];
  news: NewsItem[];
  sources: SourceStatus[];
  fetchedAt: string;
  /** "live" on the installed app; "snapshot" for the fixed copy embedded in the demo. */
  mode: "live" | "snapshot";
  /** Whether "Explicar com IA" can run here. */
  aiAvailable: boolean;
  /** Setup hints for sources that need a key (shown once in the UI). */
  hints: string[];
}
