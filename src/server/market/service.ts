import "server-only";
import { readFile } from "node:fs/promises";
import type { MarketSnapshot, NewsItem, Quote, SourceStatus } from "@/lib/market/types";
import { cached } from "./cache";
import { FEEDS, hasBrapiToken, loadB3Stocks, loadCrypto, loadEcb, loadFeed, loadIbovespa, loadPtax, loadSelic, mergeNews } from "./sources";

export const isAiConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const QUOTE_SOURCES: { id: string; label: string; ttl: number; load: () => Promise<Quote[]>; enabled: () => boolean }[] = [
  { id: "ibovespa", label: "Ibovespa (brapi)", ttl: 120_000, load: loadIbovespa, enabled: hasBrapiToken },
  { id: "b3", label: "Ações B3 (brapi)", ttl: 120_000, load: loadB3Stocks, enabled: () => true },
  { id: "ptax", label: "Dólar e euro PTAX (Banco Central)", ttl: 300_000, load: () => loadPtax(), enabled: () => true },
  { id: "selic", label: "Selic (Banco Central)", ttl: 3_600_000, load: () => loadSelic(), enabled: () => true },
  { id: "ecb", label: "Câmbio de referência (BCE)", ttl: 3_600_000, load: () => loadEcb(), enabled: () => true },
  { id: "coingecko", label: "Cripto (CoinGecko)", ttl: 60_000, load: loadCrypto, enabled: () => true },
];

/** Publisher feeds every 5 min; Google News searches every 10 min (it rate-limits). */
const newsTtl = (google?: boolean) => (google ? 600_000 : 300_000);

async function fromFixture(file: string): Promise<MarketSnapshot> {
  const snap = JSON.parse(await readFile(file, "utf8")) as MarketSnapshot;
  return { ...snap, aiAvailable: isAiConfigured() };
}

/**
 * Current market picture: quotes, headlines and the state of every source.
 * A failing source never breaks the rest; its last good data is kept.
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  // Offline/test mode: a recorded snapshot instead of live sources.
  if (process.env.MARKET_FIXTURE_FILE) return fromFixture(process.env.MARKET_FIXTURE_FILE);

  const quoteJobs = QUOTE_SOURCES.filter((s) => s.enabled()).map(async (s) => ({ s, r: await cached(`q:${s.id}`, s.ttl, s.load) }));
  const newsJobs = FEEDS.map(async (f) => ({ f, r: await cached(`n:${f.id}`, newsTtl(f.google), () => loadFeed(f)) }));
  const [quoteResults, newsResults] = await Promise.all([Promise.all(quoteJobs), Promise.all(newsJobs)]);

  const iso = (t: number) => (t ? new Date(t).toISOString() : null);
  const sources: SourceStatus[] = [
    ...quoteResults.map(({ s, r }) => ({ id: s.id, label: s.label, kind: "cotacoes" as const, ok: !r.error, count: r.value?.length ?? 0, error: r.error ?? undefined, updatedAt: iso(r.at) })),
    ...newsResults.map(({ f, r }) => ({ id: f.id, label: f.label, kind: "noticias" as const, ok: !r.error, count: r.value?.length ?? 0, error: r.error ?? undefined, updatedAt: iso(r.at) })),
  ];
  const quotes = quoteResults.flatMap(({ r }) => r.value ?? []);
  const news: NewsItem[] = mergeNews(newsResults.map(({ r }) => r.value ?? []));

  const hints: string[] = [];
  if (!hasBrapiToken()) hints.push("Para ver o Ibovespa, crie um token gratuito em brapi.dev e defina BRAPI_TOKEN no servidor.");
  if (!isAiConfigured()) hints.push("Para a explicação com IA, defina ANTHROPIC_API_KEY no servidor.");

  return { quotes, news, sources, fetchedAt: new Date().toISOString(), mode: "live", aiAvailable: isAiConfigured(), hints };
}
