import { afterEach, describe, expect, it, vi } from "vitest";
import { buildExplainPrompt, buildStandalonePrompt, finalizeExplanation } from "@/lib/market/explain";
import { changeTone, formatChange, formatQuotePrice } from "@/lib/market/format";
import { breadth, highlights, notableMoves, relatedNews, topicNews } from "@/lib/market/movers";
import { parseFeed, parseFeedDate, splitPublisher } from "@/lib/market/rss";
import { classifyTopics, stripHtml, truncate } from "@/lib/market/text";
import type { MarketSnapshot, NewsItem, Quote } from "@/lib/market/types";
import { cached, clearMarketCache } from "@/server/market/cache";
import { explainMarket } from "@/server/market/explain";
import { getMarketSnapshot } from "@/server/market/service";
import { downsample, feedToNews, FEEDS, mergeNews, ptaxQuote } from "@/server/market/sources";

const NOW = Date.parse("2026-11-26T15:00:00Z");

const quote = (over: Partial<Quote>): Quote => ({
  symbol: "X",
  name: "X",
  category: "acao",
  price: 10,
  unit: "BRL",
  changePct: 0,
  changeLabel: "no dia",
  updatedAt: "2026-11-26T14:00:00Z",
  sourceId: "t",
  note: "",
  spark: [],
  sparkLabel: "",
  keywords: [],
  ...over,
});

const news = (over: Partial<NewsItem>): NewsItem => ({
  id: Math.random().toString(16).slice(2),
  title: "",
  summary: "",
  url: "https://example.com/n",
  source: "Fonte",
  via: "Fonte",
  publishedAt: "2026-11-26T14:00:00Z",
  topics: [],
  ...over,
});

describe("feed parsing", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title><![CDATA[Ibovespa sobe 1,6% com alívio fiscal &amp; dólar cai]]></title>
      <link>https://site.com.br/a?x=1&amp;y=2</link>
      <description><![CDATA[<p>O índice <b>avançou</b> puxado por Vale&#8230;</p>]]></description>
      <pubDate>Thu, 26 Nov 2026 13:10:00 -0000</pubDate></item>
    <item><title>Sem link seguro</title><link>http://inseguro.com/x</link><pubDate>Thu, 26 Nov 2026 13:00:00 +0000</pubDate></item>
    <item><title>Dólar fecha em queda de 0,8% - Valor Econômico</title><link>https://news.google.com/rss/articles/abc</link>
      <pubDate>Thu, 26 Nov 2026 12:00:00 GMT</pubDate><source url="https://valor.globo.com">Valor Econômico</source></item>
  </channel></rss>`;

  it("reads titles, CDATA, entities and dates; skips non-https links", () => {
    const items = parseFeed(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Ibovespa sobe 1,6% com alívio fiscal & dólar cai",
      link: "https://site.com.br/a?x=1&y=2",
      description: "O índice avançou puxado por Vale…",
      publishedAt: "2026-11-26T13:10:00.000Z",
    });
    expect(items[1].source).toBe("Valor Econômico");
  });

  it("treats zone-less feed dates as UTC and rejects garbage", () => {
    expect(parseFeedDate("2026-11-26 06:54:20")).toBe("2026-11-26T06:54:20.000Z");
    expect(parseFeedDate("ontem")).toBeNull();
  });

  it("splits the publisher off Google News titles", () => {
    expect(splitPublisher("Dólar cai - Valor Econômico", "Valor Econômico")).toEqual({ title: "Dólar cai", publisher: "Valor Econômico" });
    expect(splitPublisher("Dólar cai - Valor", "Valor Econômico")).toEqual({ title: "Dólar cai", publisher: "Valor Econômico" });
    expect(splitPublisher("Título - com hífen", null)).toEqual({ title: "Título - com hífen", publisher: null });
  });

  it("keeps only market news, with publisher and topics", () => {
    const google = FEEDS.find((f) => f.google)!;
    const items = feedToNews(xml, google, Date.parse("2026-11-26T14:00:00Z"));
    expect(items.map((i) => i.title)).toEqual(["Ibovespa sobe 1,6% com alívio fiscal & dólar cai", "Dólar fecha em queda de 0,8%"]);
    expect(items[1]).toMatchObject({ source: "Valor Econômico", via: "Google Notícias", summary: "" });
    expect(items[0].topics).toEqual(expect.arrayContaining(["bolsa", "cambio", "juros"]));
    // Items older than 72 h are dropped.
    expect(feedToNews(xml, google, Date.parse("2026-12-05T00:00:00Z"))).toHaveLength(0);
  });

  it("classifies topics without accents or case and avoids false friends", () => {
    expect(classifyTopics("Copom mantém a SELIC; câmbio reage")).toEqual(["cambio", "juros"]);
    expect(classifyTopics("Bitcoin dispara com ETF")).toEqual(["cripto"]);
    expect(classifyTopics("Tesouro Nacional anuncia leilão")).toEqual([]); // "ouro" inside "tesouro"
    expect(classifyTopics("Resultado da Lotofácil de hoje")).toEqual([]);
  });

  it("merges feeds newest first without repeated headlines", () => {
    const a = news({ title: "Dólar cai a R$ 5,81!", publishedAt: "2026-11-26T10:00:00Z", source: "A" });
    const b = news({ title: "Dólar cai a R$ 5,81", publishedAt: "2026-11-26T11:00:00Z", source: "B" });
    const c = news({ title: "Ibovespa sobe", publishedAt: "2026-11-26T12:00:00Z" });
    const merged = mergeNews([[a], [b, c]]);
    expect(merged.map((n) => n.title)).toEqual(["Ibovespa sobe", "Dólar cai a R$ 5,81!"]);
  });

  it("strips html and truncates on word boundaries", () => {
    expect(stripHtml("<a href='x'>Leia &quot;mais&quot;</a><br/>agora")).toBe('Leia "mais" agora');
    expect(truncate("uma frase bem comprida para cortar", 20)).toBe("uma frase bem…");
  });
});

describe("quotes", () => {
  it("computes PTAX change against the previous business day", () => {
    const q = ptaxQuote(
      [
        { cotacaoVenda: 5.9, dataHoraCotacao: "2026-11-24 10:06:11.1", tipoBoletim: "Abertura" },
        { cotacaoVenda: 6.0, dataHoraCotacao: "2026-11-24 13:06:23.7", tipoBoletim: "Fechamento" },
        { cotacaoVenda: 5.94, dataHoraCotacao: "2026-11-25 11:05:13.2", tipoBoletim: "Intermediário" },
      ],
      { code: "USD", symbol: "USD/BRL", name: "Dólar (PTAX)", keywords: ["dolar"] },
    )!;
    expect(q.price).toBe(5.94);
    expect(q.changePct).toBeCloseTo(-1, 5);
    expect(q.updatedAt).toBe("2026-11-25T14:05:13.200Z");
    expect(q.note).toBe("Banco Central · boletim intermediário");
    expect(q.spark).toEqual([5.9, 6.0, 5.94]);
  });

  it("downsamples keeping the first and last points", () => {
    expect(downsample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4)).toEqual([1, 4, 7, 10]);
    expect(downsample([1, 2], 4)).toEqual([1, 2]);
  });

  it("formats prices by unit and changes with sign", () => {
    expect(formatQuotePrice(quote({ price: 41.36, unit: "BRL" }))).toBe("R$ 41,36");
    expect(formatQuotePrice(quote({ price: 60507.2, unit: "USD", category: "cripto" }))).toBe("US$ 60.507");
    expect(formatQuotePrice(quote({ price: 0.0564, unit: "USD", category: "cripto" }))).toBe("US$ 0,0564");
    expect(formatQuotePrice(quote({ price: 1.09351, unit: "", category: "cambio" }))).toBe("1,0935");
    expect(formatQuotePrice(quote({ price: 159.32, unit: "", category: "cambio" }))).toBe("159,32");
    expect(formatQuotePrice(quote({ price: 13.75, unit: "% a.a.", category: "juros" }))).toBe("13,75% a.a.");
    expect(formatQuotePrice(quote({ price: 128456.7, unit: "pts", category: "indice" }))).toBe("128.457 pts");
    expect(formatChange(2.5)).toBe("+2,50%");
    expect(formatChange(-0.254)).toBe("−0,25%");
    expect(formatChange(0.001)).toBe("0,00%");
    expect(formatChange(null)).toBe("—");
    expect(changeTone(-1)).toBe("neg");
  });
});

describe("what is moving the market", () => {
  const petr = quote({ symbol: "PETR4", name: "Petrobras", changePct: 3.2, keywords: ["petrobras|petr4"] });
  const vale = quote({ symbol: "VALE3", name: "Vale", changePct: -1.5, keywords: ["vale3|vale(?! a pena| do| dos)"] });
  const coins = ["BTC", "ETH", "SOL", "XRP"].map((s, i) => quote({ symbol: s, name: s, category: "cripto", changePct: 3.5 + i, keywords: [s.toLowerCase()] }));
  const usd = quote({ symbol: "USD/BRL", category: "cambio", changePct: 0.2, keywords: ["dolar"] });
  const selic = quote({ symbol: "SELIC", category: "juros", changePct: null });

  it("flags moves above each class threshold and groups a whole market", () => {
    expect(notableMoves([petr, vale, usd, selic]).map((m) => m.quote.symbol)).toEqual(["PETR4"]);
    const h = highlights([petr, vale, usd, ...coins]);
    expect(h[0]).toMatchObject({ kind: "group", category: "cripto", direction: "up", total: 4 });
    expect(h[1]).toMatchObject({ kind: "asset", move: { quote: { symbol: "PETR4" } } });
    expect(breadth([petr, vale, usd, selic])).toEqual({ up: 2, down: 1, flat: 0 });
  });

  it("ranks headlines that name the asset and explain the move", () => {
    const list = [
      news({ title: "Petrobras anuncia novo diretor", publishedAt: "2026-11-26T14:30:00Z" }),
      news({ title: "Petrobras sobe 3% após alta do petróleo", publishedAt: "2026-11-26T12:00:00Z" }),
      news({ title: "Vale a pena investir em fundos?", publishedAt: "2026-11-26T14:00:00Z" }),
      news({ title: "Petrobras: notícia velha", publishedAt: "2026-11-20T12:00:00Z" }),
    ];
    expect(relatedNews(petr, list, NOW).map((n) => n.title)).toEqual(["Petrobras sobe 3% após alta do petróleo", "Petrobras anuncia novo diretor"]);
    expect(relatedNews(vale, list, NOW)).toEqual([]);
    const cripto = [news({ title: "Bitcoin dispara após dados dos EUA", topics: ["cripto"] }), news({ title: "Fed mantém juros", topics: ["exterior"] })];
    expect(topicNews("cripto", cripto, NOW).map((n) => n.title)).toEqual(["Bitcoin dispara após dados dos EUA"]);
  });
});

describe("AI explanation", () => {
  const snap: MarketSnapshot = {
    quotes: [quote({ symbol: "PETR4", name: "Petrobras", changePct: 3.2, keywords: ["petrobras"] })],
    news: [
      news({ id: "a", title: "Petrobras sobe após alta do petróleo", topics: ["empresas"] }),
      news({ id: "b", title: "Copom mantém Selic", topics: ["juros"], publishedAt: "2026-11-26T13:00:00Z" }),
    ],
    sources: [],
    fetchedAt: "2026-11-26T15:00:00Z",
    mode: "live",
    aiAvailable: true,
    hints: [],
  };

  it("numbers the headlines the model may cite and includes the moves", () => {
    const { prompt, headlines } = buildExplainPrompt(snap, null);
    expect(headlines.map((h) => h.id)).toEqual(["a", "b"]);
    expect(prompt).toContain("[1] 2026-11-26T14:00:00Z · Fonte: Petrobras sobe após alta do petróleo");
    expect(prompt).toContain("Maiores movimentos: Petrobras +3,20%");
    expect(buildStandalonePrompt(snap, "PETR4").prompt).toMatch(/Não faça previsões[\s\S]*por que Petrobras[\s\S]*Responda apenas com um objeto JSON/);
  });

  it("drops citations that point to no headline and rejects malformed answers", () => {
    const { headlines } = buildExplainPrompt(snap, null);
    const r = finalizeExplanation(
      { overview: "Alta puxada por petróleo.", drivers: [{ asset: "Petrobras", direction: "alta", explanation: "Petróleo subiu.", sources: [1, 1, 7, 0] }], confidence: "media", caveat: "" },
      headlines,
      "teste",
    );
    expect(r.explanation.drivers[0].sources).toEqual([1]);
    expect(r.headlines[0]).toEqual({ id: "a", title: "Petrobras sobe após alta do petróleo", source: "Fonte", url: "https://example.com/n", publishedAt: "2026-11-26T14:00:00Z" });
    expect(() => finalizeExplanation({ overview: 1 }, headlines, "teste")).toThrow();
  });

  it("is refused clearly when no API key is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "");
    await expect(explainMarket(snap, null)).rejects.toMatchObject({ status: 503 });
    vi.unstubAllEnvs();
  });
});

describe("market service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    clearMarketCache();
  });

  it("shares one fetch between callers and keeps the last value when a refresh fails", async () => {
    let calls = 0;
    const load = vi.fn(async () => {
      calls++;
      if (calls === 2) throw new Error("fora do ar");
      return calls;
    });
    const [a, b] = await Promise.all([cached("k", 0, load), cached("k", 0, load)]);
    expect(a.value).toBe(1);
    expect(b.value).toBe(1);
    const c = await cached("k", 0, load);
    expect(c).toMatchObject({ value: 1, error: "fora do ar" });
  });

  it("returns what the working sources have when others fail", async () => {
    vi.stubEnv("BRAPI_TOKEN", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("coingecko")) {
          return new Response(JSON.stringify([{ id: "bitcoin", current_price: 60000, price_change_percentage_24h: -4.2, last_updated: "2026-11-26T14:59:00Z", sparkline_in_7d: { price: [1, 2, 3] } }]));
        }
        if (url.includes("moneytimes")) {
          return new Response(
            `<rss><channel><item><title>Bitcoin cai 4% com aversão a risco</title><link>https://www.moneytimes.com.br/x</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`,
          );
        }
        return new Response("erro", { status: 500 });
      }),
    );
    const snap = await getMarketSnapshot();
    expect(snap.quotes.map((q) => q.symbol)).toEqual(["BTC"]);
    expect(snap.news.map((n) => n.title)).toEqual(["Bitcoin cai 4% com aversão a risco"]);
    expect(snap.sources.find((s) => s.id === "coingecko")).toMatchObject({ ok: true, count: 1 });
    expect(snap.sources.find((s) => s.id === "b3")).toMatchObject({ ok: false, error: "Fonte respondeu HTTP 500" });
    expect(snap.sources.some((s) => s.id === "ibovespa")).toBe(false);
    expect(snap.hints[0]).toContain("BRAPI_TOKEN");
    expect(notableMoves(snap.quotes)[0].direction).toBe("down");
  });
});
