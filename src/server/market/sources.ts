import "server-only";
import { parseFeed, splitPublisher } from "@/lib/market/rss";
import { classifyTopics, hashId, normalize, truncate } from "@/lib/market/text";
import type { NewsItem, Quote } from "@/lib/market/types";

/*
 * Every source below is a public, documented service (or a publisher's own RSS
 * feed). None needs a login; BRAPI_TOKEN only unlocks the Ibovespa index.
 */

const UA = "Mozilla/5.0 (compatible; TradingDesk/1.0; painel pessoal de mercado)";

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*", ...headers },
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(res.status === 429 ? "Limite de consultas da fonte atingido (HTTP 429)" : `Fonte respondeu HTTP ${res.status}`);
  return res.text();
}

const fetchJson = async <T>(url: string, headers?: Record<string, string>) => JSON.parse(await fetchText(url, headers)) as T;

/** Keeps at most `n` evenly spaced points (always the last one). */
export function downsample(values: number[], n: number): number[] {
  if (values.length <= n) return values;
  const step = (values.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => values[Math.round(i * step)]);
}

/* --------------------------------- CoinGecko -------------------------------- */

const COINS: { id: string; symbol: string; name: string; keywords: string[] }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", keywords: ["bitcoin|btc|criptomoedas?|criptoativos?"] },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", keywords: ["ethereum|ether"] },
  { id: "binancecoin", symbol: "BNB", name: "BNB", keywords: ["bnb|binance"] },
  { id: "ripple", symbol: "XRP", name: "XRP", keywords: ["xrp|ripple"] },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", keywords: ["dogecoin|doge"] },
  { id: "cardano", symbol: "ADA", name: "Cardano", keywords: ["cardano"] },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", keywords: ["avalanche|avax"] },
  { id: "sui", symbol: "SUI", name: "Sui", keywords: ["sui"] },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", keywords: ["chainlink"] },
  { id: "stellar", symbol: "XLM", name: "Stellar", keywords: ["stellar|xlm"] },
];

interface CoinMarket {
  id: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

export async function loadCrypto(): Promise<Quote[]> {
  const key = process.env.COINGECKO_DEMO_API_KEY;
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS.map((c) => c.id).join(",")}&sparkline=true&price_change_percentage=24h`;
  const rows = await fetchJson<CoinMarket[]>(url, key ? { "x-cg-demo-api-key": key } : {});
  const byId = new Map(rows.map((r) => [r.id, r]));
  return COINS.flatMap((c) => {
    const r = byId.get(c.id);
    if (!r || typeof r.current_price !== "number") return [];
    return [
      {
        symbol: c.symbol,
        name: c.name,
        category: "cripto" as const,
        price: r.current_price,
        unit: "USD",
        changePct: r.price_change_percentage_24h ?? null,
        changeLabel: "em 24 h",
        updatedAt: r.last_updated,
        sourceId: "coingecko",
        note: "CoinGecko · média de corretoras",
        spark: downsample(r.sparkline_in_7d?.price ?? [], 42),
        sparkLabel: "7 dias",
        keywords: c.keywords,
      },
    ];
  });
}

/* ----------------------------------- brapi ---------------------------------- */

/** Tickers brapi serves without a token. */
const FREE_TICKERS: { symbol: string; name: string; keywords: string[] }[] = [
  { symbol: "PETR4", name: "Petrobras PN", keywords: ["petrobras|petr4|petr3"] },
  { symbol: "VALE3", name: "Vale ON", keywords: ["vale3|vale(?! a pena| do| dos)|mineradora"] },
  { symbol: "ITUB4", name: "Itaú Unibanco PN", keywords: ["itau unibanco|itau|itub4"] },
  { symbol: "MGLU3", name: "Magazine Luiza ON", keywords: ["magazine luiza|magalu|mglu3"] },
];

interface BrapiQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number | null;
  regularMarketTime: string;
  currency: string;
  historicalDataPrice?: { date: number; close: number | null }[];
}

function brapiQuote(r: BrapiQuote, meta: { symbol: string; name: string; keywords: string[] }, category: Quote["category"]): Quote {
  return {
    symbol: meta.symbol,
    name: meta.name,
    category,
    price: r.regularMarketPrice,
    unit: category === "indice" ? "pts" : r.currency || "BRL",
    changePct: r.regularMarketChangePercent ?? null,
    changeLabel: "no dia",
    updatedAt: new Date(r.regularMarketTime).toISOString(),
    sourceId: "brapi",
    note: "B3 via brapi · pode ter atraso",
    spark: (r.historicalDataPrice ?? [])
      .filter((h) => typeof h.close === "number")
      .sort((a, b) => a.date - b.date)
      .map((h) => h.close as number),
    sparkLabel: "último pregão",
    keywords: meta.keywords,
  };
}

export async function loadB3Stocks(): Promise<Quote[]> {
  const url = `https://brapi.dev/api/quote/${FREE_TICKERS.map((t) => t.symbol).join(",")}?range=1d&interval=15m`;
  const data = await fetchJson<{ results: BrapiQuote[] }>(url);
  return FREE_TICKERS.flatMap((t) => {
    const r = data.results.find((x) => x.symbol === t.symbol);
    return r && typeof r.regularMarketPrice === "number" ? [brapiQuote(r, t, "acao")] : [];
  });
}

export const hasBrapiToken = () => !!process.env.BRAPI_TOKEN;

/** Ibovespa (^BVSP): brapi requires a free token for indices. */
export async function loadIbovespa(): Promise<Quote[]> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) return [];
  const data = await fetchJson<{ results: BrapiQuote[] }>("https://brapi.dev/api/quote/%5EBVSP?range=1d&interval=15m", { Authorization: `Bearer ${token}` });
  const r = data.results?.[0];
  return r && typeof r.regularMarketPrice === "number" ? [brapiQuote(r, { symbol: "IBOV", name: "Ibovespa", keywords: ["ibovespa|ibov|bolsa brasileira|b3"] }, "indice")] : [];
}

/* ------------------------------ Banco Central -------------------------------- */

interface PtaxRow {
  cotacaoVenda: number;
  dataHoraCotacao: string;
  tipoBoletim: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const bcbDate = (d: Date) => `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${d.getUTCFullYear()}`;
/** PTAX times are Brasília local time (UTC-3, no daylight saving since 2019). */
const ptaxIso = (s: string) => new Date(`${s.replace(" ", "T").slice(0, 23)}-03:00`).toISOString();

const PTAX: { code: string; symbol: string; name: string; keywords: string[] }[] = [
  { code: "USD", symbol: "USD/BRL", name: "Dólar (PTAX)", keywords: ["dolar|cambio|ptax|moeda americana"] },
  { code: "EUR", symbol: "EUR/BRL", name: "Euro (PTAX)", keywords: ["euro"] },
];

/** Official Banco Central rate: opening, intraday and closing bulletins of each business day. */
export function ptaxQuote(rows: PtaxRow[], meta: (typeof PTAX)[number]): Quote | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => a.dataHoraCotacao.localeCompare(b.dataHoraCotacao));
  const last = sorted[sorted.length - 1];
  const lastDay = last.dataHoraCotacao.slice(0, 10);
  const previous = [...sorted].reverse().find((r) => r.dataHoraCotacao.slice(0, 10) < lastDay);
  const changePct = previous ? ((last.cotacaoVenda - previous.cotacaoVenda) / previous.cotacaoVenda) * 100 : null;
  const kind = last.tipoBoletim === "Fechamento" ? "fechamento" : last.tipoBoletim === "Abertura" ? "abertura" : "boletim intermediário";
  return {
    symbol: meta.symbol,
    name: meta.name,
    category: "cambio",
    price: last.cotacaoVenda,
    unit: "BRL",
    changePct,
    changeLabel: "vs. PTAX do dia útil anterior",
    updatedAt: ptaxIso(last.dataHoraCotacao),
    sourceId: "bcb",
    note: `Banco Central · ${kind}`,
    spark: sorted.map((r) => r.cotacaoVenda),
    sparkLabel: "últimos dias úteis",
    keywords: meta.keywords,
  };
}

export async function loadPtax(now = new Date()): Promise<Quote[]> {
  const from = new Date(now.getTime() - 8 * 86400_000);
  const quotes = await Promise.all(
    PTAX.map(async (m) => {
      const url =
        "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
        `?@moeda='${m.code}'&@dataInicial='${bcbDate(from)}'&@dataFinalCotacao='${bcbDate(now)}'&$format=json&$select=cotacaoVenda,dataHoraCotacao,tipoBoletim`;
      const data = await fetchJson<{ value: PtaxRow[] }>(url);
      return ptaxQuote(data.value ?? [], m);
    }),
  );
  return quotes.filter((q): q is Quote => q !== null);
}

/** Selic target set by Copom (SGS series 432). */
export async function loadSelic(now = new Date()): Promise<Quote[]> {
  const rows = await fetchJson<{ data: string; valor: string }[]>("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json");
  const v = Number(rows?.[0]?.valor);
  if (!Number.isFinite(v)) return [];
  return [
    {
      symbol: "SELIC",
      name: "Selic (meta)",
      category: "juros",
      price: v,
      unit: "% a.a.",
      changePct: null,
      changeLabel: "",
      updatedAt: now.toISOString(),
      sourceId: "bcb",
      note: "Meta definida pelo Copom · Banco Central",
      spark: [],
      sparkLabel: "",
      keywords: ["selic|copom|juros"],
    },
  ];
}

/* ------------------------------ BCE (Frankfurter) ---------------------------- */

const ECB_PAIRS: { symbol: string; name: string; code: string; invert: boolean; keywords: string[] }[] = [
  { symbol: "EUR/USD", name: "Euro / Dólar", code: "EUR", invert: true, keywords: ["euro|bce|zona do euro"] },
  { symbol: "GBP/USD", name: "Libra / Dólar", code: "GBP", invert: true, keywords: ["libra|banco da inglaterra|reino unido"] },
  { symbol: "USD/JPY", name: "Dólar / Iene", code: "JPY", invert: false, keywords: ["iene|japao|banco do japao"] },
  { symbol: "AUD/USD", name: "Dólar australiano / Dólar", code: "AUD", invert: true, keywords: ["dolar australiano|australia"] },
];

/** European Central Bank reference rates (published once per business day). */
export async function loadEcb(now = new Date()): Promise<Quote[]> {
  const from = new Date(now.getTime() - 14 * 86400_000).toISOString().slice(0, 10);
  const data = await fetchJson<{ rates: Record<string, Record<string, number>> }>(
    `https://api.frankfurter.dev/v1/${from}..?base=USD&symbols=${ECB_PAIRS.map((p) => p.code).join(",")}`,
  );
  const days = Object.keys(data.rates ?? {}).sort();
  if (!days.length) return [];
  return ECB_PAIRS.flatMap((p) => {
    const series = days.map((d) => data.rates[d]?.[p.code]).filter((v): v is number => typeof v === "number" && v > 0).map((v) => (p.invert ? 1 / v : v));
    if (!series.length) return [];
    const last = series[series.length - 1];
    const prev = series.length > 1 ? series[series.length - 2] : null;
    return [
      {
        symbol: p.symbol,
        name: p.name,
        category: "cambio" as const,
        price: Math.round(last * 1e5) / 1e5,
        unit: "",
        changePct: prev ? ((last - prev) / prev) * 100 : null,
        changeLabel: "vs. dia útil anterior",
        updatedAt: new Date(`${days[days.length - 1]}T14:15:00Z`).toISOString(),
        sourceId: "ecb",
        note: "Referência diária do BCE",
        spark: series,
        sparkLabel: "2 semanas",
        keywords: p.keywords,
      },
    ];
  });
}

/* ----------------------------------- News ------------------------------------ */

export interface FeedConfig {
  id: string;
  label: string;
  url: string;
  /** Fixed publisher name; Google News items carry their own. */
  publisher?: string;
  /** Google News search (publisher comes from each item). */
  google?: boolean;
  limit: number;
}

const gnews = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:1d`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

export const FEEDS: FeedConfig[] = [
  { id: "moneytimes", label: "Money Times", url: "https://www.moneytimes.com.br/feed/", publisher: "Money Times", limit: 20 },
  { id: "infomoney", label: "InfoMoney", url: "https://www.infomoney.com.br/feed/", publisher: "InfoMoney", limit: 20 },
  { id: "investing", label: "Investing.com Brasil", url: "https://br.investing.com/rss/news.rss", publisher: "Investing.com", limit: 20 },
  { id: "gnews-brasil", label: "Google Notícias · Brasil", url: gnews('ibovespa OR dólar OR Selic OR Copom OR "juros futuros"'), google: true, limit: 30 },
  { id: "gnews-exterior", label: "Google Notícias · Exterior e commodities", url: gnews('"Wall Street" OR Nasdaq OR petróleo OR "minério de ferro"'), google: true, limit: 20 },
  { id: "gnews-cripto", label: "Google Notícias · Cripto", url: gnews("bitcoin OR criptomoedas"), google: true, limit: 15 },
];

/** Turns one feed into news items (only market-related ones are kept). */
export function feedToNews(xml: string, feed: FeedConfig, now = Date.now()): NewsItem[] {
  const out: NewsItem[] = [];
  for (const it of parseFeed(xml)) {
    if (!it.publishedAt) continue;
    const age = now - Date.parse(it.publishedAt);
    if (age > 72 * 3600_000 || age < -15 * 60_000) continue;
    const google = !!feed.google;
    const { title, publisher } = google ? splitPublisher(it.title, it.source) : { title: it.title, publisher: null };
    // "Investing.com Brasil - Finanças, Câmbio e Investimentos" -> "Investing.com Brasil"
    const source = (publisher ?? feed.publisher ?? feed.label).split(" - ")[0].trim();
    const summary = google ? "" : truncate(it.description, 240);
    const topics = classifyTopics(`${title} ${summary}`);
    if (!topics.length) continue;
    out.push({
      id: hashId(it.link),
      title,
      summary,
      url: it.link,
      source,
      via: google ? "Google Notícias" : feed.label,
      publishedAt: it.publishedAt,
      topics,
    });
    if (out.length >= feed.limit) break;
  }
  return out;
}

export async function loadFeed(feed: FeedConfig): Promise<NewsItem[]> {
  return feedToNews(await fetchText(feed.url, { Accept: "application/rss+xml, application/xml, text/xml" }), feed);
}

/** Merges feeds: newest first, one item per headline (the publisher's own feed wins). */
export function mergeNews(lists: NewsItem[][], max = 150): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of lists.flat()) {
    const key = normalize(item.title).replace(/[^a-z0-9 ]/g, "").slice(0, 70);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, max);
}
