"use client";

import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/domain/dates";
import { changeTone, formatChange, formatQuotePrice } from "@/lib/market/format";
import type { NewsItem, Quote } from "@/lib/market/types";
import { NEWS_TOPIC_LABELS } from "@/lib/market/types";
import { gsap, shouldReduceMotion, useGSAP } from "@/lib/gsap";
import { timeAgo } from "@/features/activity/describe";

const TONE_TEXT = { pos: "text-pos", neg: "text-neg", neutral: "text-muted" } as const;

/** Only https links from feeds are rendered as links. */
export const safeUrl = (url: string) => (/^https:\/\//i.test(url) ? url : undefined);

export function ChangePill({ value, className }: { value: number | null; className?: string }) {
  const tone = changeTone(value);
  const Icon = tone === "pos" ? ArrowUpRight : tone === "neg" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        tone === "pos" ? "bg-pos/12 text-pos" : tone === "neg" ? "bg-neg/12 text-neg" : "bg-white/[0.05] text-muted",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {formatChange(value)}
    </span>
  );
}

/** Tiny line chart; the path draws in once (skipped with reduced motion). */
export function Sparkline({ values, tone, className, label }: { values: number[]; tone: "pos" | "neg" | "neutral"; className?: string; label?: string }) {
  const ref = useRef<SVGPathElement>(null);
  const W = 120;
  const H = 34;
  const pts = values.filter((v) => Number.isFinite(v));
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const d = pts.length > 1 ? pts.map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`).join(" ") : "";

  useGSAP(
    () => {
      const path = ref.current;
      if (!path || !d || shouldReduceMotion()) return;
      const len = path.getTotalLength();
      gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.out", clearProps: "strokeDasharray,strokeDashoffset" });
    },
    { dependencies: [d] },
  );

  if (!d) return <div className={cn("h-[34px]", className)} aria-hidden />;
  const color = tone === "pos" ? "var(--color-pos)" : tone === "neg" ? "var(--color-neg)" : "var(--color-muted)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn("h-[34px] w-full overflow-visible", className)} role="img" aria-label={label ?? "Evolução recente"}>
      <path ref={ref} d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function QuoteCard({ quote, tz, now }: { quote: Quote; tz: string; now: number }) {
  const tone = changeTone(quote.changePct);
  const prev = useRef(quote.price);
  const cardRef = useRef<HTMLDivElement>(null);

  // Flash the card when a refresh brings a new price.
  useGSAP(
    () => {
      const el = cardRef.current;
      const before = prev.current;
      prev.current = quote.price;
      if (!el || before === quote.price || shouldReduceMotion()) return;
      const up = quote.price > before;
      gsap.fromTo(el, { backgroundColor: up ? "rgba(30,211,138,0.16)" : "rgba(245,71,92,0.16)" }, { backgroundColor: "rgba(255,255,255,0.02)", duration: 1.4, ease: "power2.out", clearProps: "backgroundColor" });
    },
    { dependencies: [quote.price] },
  );

  return (
    <div ref={cardRef} className="rounded-xl border border-line bg-white/[0.02] p-3.5 transition-colors hover:border-line-strong" data-testid={`quote-${quote.symbol}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-fg">{quote.name}</p>
          <p className="mono text-[11px] text-subtle">{quote.symbol}</p>
        </div>
        {quote.changePct !== null && <ChangePill value={quote.changePct} />}
      </div>
      <p className="num mt-2 text-lg font-semibold tracking-tight text-fg">{formatQuotePrice(quote)}</p>
      {quote.spark.length > 1 && <Sparkline values={quote.spark} tone={tone} className="mt-1.5" label={`${quote.name}: ${quote.sparkLabel}`} />}
      <p className="mt-1.5 text-[11px] leading-snug text-subtle">
        {quote.changePct !== null && quote.changeLabel ? `${quote.changeLabel} · ` : ""}
        {quote.note}
      </p>
      <p className="text-[11px] text-subtle">Atualizado {quote.category === "juros" ? "na consulta" : `${formatTime(quote.updatedAt, tz)} · ${timeAgo(quote.updatedAt, now || undefined)}`}</p>
    </div>
  );
}

export function NewsLink({ item, now, compact = false, index }: { item: NewsItem; now: number; compact?: boolean; index?: number }) {
  const href = safeUrl(item.url);
  return (
    <article className={cn("group", compact ? "py-2" : "py-3")} data-testid="news-item">
      <div className="flex items-center gap-2 text-[11px] text-subtle">
        {index !== undefined && <span className="mono rounded bg-white/[0.06] px-1 text-[10px] text-muted">[{index}]</span>}
        <span className="font-medium text-muted">{item.source}</span>
        <span aria-hidden>·</span>
        <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt, now || undefined)}</time>
        {!compact && item.via !== item.source && <span className="max-sm:hidden">· via {item.via}</span>}
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-start gap-1.5 text-[13.5px] leading-snug font-medium text-fg decoration-white/30 underline-offset-4 group-hover:underline">
        <span>{item.title}</span>
        <ExternalLink className="mt-1 size-3 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </a>
      {!compact && item.summary && <p className="mt-1 line-clamp-2 text-xs text-muted">{item.summary}</p>}
      {!compact && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.topics.map((t) => (
            <span key={t} className="rounded border border-line px-1.5 py-px text-[10.5px] text-subtle">
              {NEWS_TOPIC_LABELS[t]}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export const toneText = (v: number | null) => TONE_TEXT[changeTone(v)];
