import { decodeEntities, stripHtml } from "./text";

export interface RssItem {
  title: string;
  link: string;
  description: string;
  /** ISO date, or null when the feed gave none (or an unreadable one). */
  publishedAt: string | null;
  /** `<source>` element (Google News puts the original publisher there). */
  source: string | null;
}

const unwrap = (s: string) => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? unwrap(m[1]) : null;
}

/**
 * Feed dates: RFC 822 ("Thu, 26 Nov 2026 00:28:39 +0000"), ISO with zone, or
 * "2026-11-26 06:54:20" without one, which feeds publish in UTC.
 */
export function parseFeedDate(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const naive = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
  const t = naive ? Date.parse(`${naive[1]}T${naive[2]}Z`) : Date.parse(s.replace(/ -0000$/, " +0000"));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Minimal RSS 2.0 / Atom reader: enough for news feeds, no external parser. */
export function parseFeed(xml: string): RssItem[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const items: RssItem[] = [];
  for (const b of blocks) {
    const title = stripHtml(tag(b, "title") ?? "");
    let link = tag(b, "link") ?? "";
    if (!link) link = b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "";
    link = decodeEntities(link.trim());
    if (!title || !/^https:\/\//i.test(link)) continue;
    const description = stripHtml(tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content") ?? "");
    const date = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
    const source = tag(b, "source");
    items.push({ title, link, description, publishedAt: parseFeedDate(date), source: source ? stripHtml(source) : null });
  }
  return items;
}

/** Google News titles end with " - Publisher"; split it off when it matches the source element. */
export function splitPublisher(title: string, source: string | null): { title: string; publisher: string | null } {
  if (!source) return { title, publisher: null };
  if (title.endsWith(` - ${source}`)) return { title: title.slice(0, -(source.length + 3)).trim(), publisher: source };
  // The suffix can be a variant of the publisher name ("Valor" vs "Valor Econômico").
  const m = title.match(/^(.*\S)\s+-\s+[^-]{2,40}$/);
  return { title: m ? m[1] : title, publisher: source };
}
