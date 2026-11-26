import { hasCausalWording, hasMoveWording, normalize } from "./text";
import type { NewsItem, NewsTopic, Quote, QuoteCategory } from "./types";

/** Move (in %) from which an asset counts as a highlight, by asset class. */
export const MOVE_THRESHOLD: Record<QuoteCategory, number> = {
  indice: 1,
  acao: 2,
  cambio: 0.6,
  cripto: 3,
  juros: Number.POSITIVE_INFINITY,
};

export interface Move {
  quote: Quote;
  /** |change| relative to the class threshold (1 = exactly at the threshold). */
  strength: number;
  direction: "up" | "down";
}

/** Assets whose change reached their class threshold, strongest first. */
export function notableMoves(quotes: Quote[]): Move[] {
  return quotes
    .filter((q) => q.changePct !== null && Number.isFinite(MOVE_THRESHOLD[q.category]))
    .map((q) => ({ quote: q, strength: Math.abs(q.changePct!) / MOVE_THRESHOLD[q.category], direction: q.changePct! >= 0 ? ("up" as const) : ("down" as const) }))
    .filter((m) => m.strength >= 1)
    .sort((a, b) => b.strength - a.strength);
}

const HOUR = 3600_000;

const CATEGORY_TOPIC: Partial<Record<QuoteCategory, NewsTopic>> = { indice: "bolsa", acao: "bolsa", cambio: "cambio", cripto: "cripto" };

export type Highlight =
  | { kind: "asset"; move: Move }
  /** Several assets of one class moving the same way (e.g. the whole crypto market). */
  | { kind: "group"; category: QuoteCategory; direction: "up" | "down"; moves: Move[]; total: number };

/**
 * Highlights for the "what is moving" panel: when 3+ assets of one class move
 * past the threshold in the same direction they are shown as one market move.
 */
export function highlights(quotes: Quote[]): Highlight[] {
  const moves = notableMoves(quotes);
  const out: Highlight[] = [];
  const grouped = new Set<Move>();
  for (const cat of ["cripto", "acao", "cambio"] as QuoteCategory[]) {
    for (const dir of ["up", "down"] as const) {
      const same = moves.filter((m) => m.quote.category === cat && m.direction === dir);
      if (same.length >= 3) {
        same.forEach((m) => grouped.add(m));
        out.push({ kind: "group", category: cat, direction: dir, moves: same, total: quotes.filter((q) => q.category === cat).length });
      }
    }
  }
  for (const m of moves) if (!grouped.has(m)) out.push({ kind: "asset", move: m });
  const strength = (h: Highlight) => (h.kind === "asset" ? h.move.strength : Math.max(...h.moves.map((m) => m.strength)) + 0.5);
  return out.sort((a, b) => strength(b) - strength(a));
}

/** Headlines about a whole asset class (topic match), move/cause wording first. */
export function topicNews(category: QuoteCategory, news: NewsItem[], now = Date.now(), limit = 3): NewsItem[] {
  const topic = CATEGORY_TOPIC[category];
  if (!topic) return [];
  return news
    .filter((n) => n.topics.includes(topic) && now - Date.parse(n.publishedAt) <= 36 * HOUR)
    .map((n) => {
      const t = normalize(n.title);
      return { n, score: (hasMoveWording(t) ? 2 : 0) + (hasCausalWording(t) ? 2 : 0) + (now - Date.parse(n.publishedAt) <= 12 * HOUR ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score || Date.parse(b.n.publishedAt) - Date.parse(a.n.publishedAt))
    .slice(0, limit)
    .map((x) => x.n);
}

/**
 * Headlines that mention an asset, ranked so that the ones describing the move
 * and its reason come first. This only links news to the asset: it does not
 * claim that a headline caused the move.
 */
export function relatedNews(quote: Quote, news: NewsItem[], now = Date.now(), limit = 3): NewsItem[] {
  const patterns = quote.keywords.map((k) => new RegExp(`\\b(${k})\\b`));
  if (!patterns.length) return [];
  const scored: { item: NewsItem; score: number }[] = [];
  for (const item of news) {
    const age = now - Date.parse(item.publishedAt);
    if (!(age <= 48 * HOUR)) continue;
    const title = normalize(item.title);
    const summary = normalize(item.summary);
    const inTitle = patterns.filter((p) => p.test(title)).length;
    const inSummary = patterns.filter((p) => p.test(summary)).length;
    if (!inTitle && !inSummary) continue;
    let score = inTitle * 3 + inSummary;
    if (hasMoveWording(title)) score += 2;
    if (hasCausalWording(title)) score += 2;
    score += age <= 12 * HOUR ? 2 : age <= 24 * HOUR ? 1 : 0;
    scored.push({ item, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || Date.parse(b.item.publishedAt) - Date.parse(a.item.publishedAt))
    .slice(0, limit)
    .map((s) => s.item);
}

export interface Breadth {
  up: number;
  down: number;
  flat: number;
}

/** How many tracked assets are up/down (|change| < 0.05% counts as flat). */
export function breadth(quotes: Quote[]): Breadth {
  const b = { up: 0, down: 0, flat: 0 };
  for (const q of quotes) {
    if (q.changePct === null || q.category === "juros") continue;
    if (q.changePct >= 0.05) b.up++;
    else if (q.changePct <= -0.05) b.down++;
    else b.flat++;
  }
  return b;
}
