import { NEWS_TOPICS, type NewsTopic } from "./types";

/** Lowercase, without accents, single spaces: the form every keyword is matched against. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Keywords per topic, as regular expressions over normalized text. */
const TOPIC_PATTERNS: Record<NewsTopic, RegExp> = {
  bolsa: /\b(ibovespa|ibov|b3|bolsa brasileira|bolsa de valores|bolsas? (de nova york|europeias?|asiaticas?|globais|americanas?)|small caps|acoes brasileiras|mercado de acoes|pregao|indice (futuro|de acoes))\b/,
  cambio: /\b(dolar|cambio|real (se )?(valoriza|desvaloriza)|moeda americana|euro|ptax)\b/,
  juros: /\b(selic|copom|juros|inflacao|ipca|igp-?m|banco central|fiscal|arcabouco|tesouro direto|di futuro|curva de juros|pib|desemprego|ministerio da fazenda|payroll|pce)\b/,
  exterior: /\b(wall street|nasdaq|s&p ?500|dow jones|nyse|fed|federal reserve|powell|treasur(y|ies)|eua|estados unidos|china|europa|bce|trump|tarifas?|nikkei|hang seng|stoxx|dax|ftse)\b/,
  commodities: /\b(petroleo|brent|wti|opep|minerio|ouro|prata|cobre|commodit(y|ies)|soja|milho|cafe|boi gordo)\b/,
  cripto: /\b(bitcoin|btc|ethereum|ether|cripto(moeda|moedas|ativos?)?|blockchain|solana|xrp|stablecoins?|etf de bitcoin)\b/,
  empresas: /\b([a-z]{4}(3|4|5|6|11)|lucro|prejuizo|balanco|resultado (do|no) trimestre|dividendos|jcp|ipo|aquisicao|fusao|recompra|rebaixa|eleva recomendacao)\b/,
};

export function classifyTopics(text: string): NewsTopic[] {
  const n = normalize(text);
  return NEWS_TOPICS.filter((t) => TOPIC_PATTERNS[t].test(n));
}

/** Words that usually introduce the reason for a move ("sobe após...", "o que fez..."). */
const CAUSAL = /\b(por que|porque|o que (fez|explica|levou)|apos|com (a |o )?|diante|devido|puxad[oa]s?|pressionad[oa]s?|impulsionad[oa]s?|reflete|em meio|reage|repercute|motivo)\b/;
/** Words that describe a market move. */
const MOVE = /\b(sobe|subiu|alta|avanca|dispara|salta|cai|caiu|queda|recua|despenca|desaba|tomba|fecha|abre|renova|maxima|minima|valoriza|desvaloriza|oscila)\b/;

export const hasCausalWording = (normalized: string) => CAUSAL.test(normalized);
export const hasMoveWording = (normalized: string) => MOVE.test(normalized);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Plain text from an HTML fragment (tags dropped, entities decoded, spaces collapsed). */
export function stripHtml(s: string): string {
  const noTags = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(decodeEntities(noTags)).replace(/\s+/g, " ").trim();
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** Small stable hash for ids (FNV-1a, hex). */
export function hashId(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
