"use client";

import { ArrowRight, Globe } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Panel } from "@/components/ui/misc";
import { useNowMinute } from "@/hooks/use-client-store";
import { useMarket } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { formatChange, formatQuotePrice } from "@/lib/market/format";
import { highlights, relatedNews, topicNews } from "@/lib/market/movers";
import { QUOTE_CATEGORY_LABELS } from "@/lib/market/types";
import { NewsLink, toneText } from "./market-bits";

const KEY_SYMBOLS = ["IBOV", "USD/BRL", "PETR4", "VALE3", "BTC", "ETH", "EUR/USD", "ITUB4"];

/** Compact "market now" panel for the dashboard. */
export function MarketWidget({ className, ...rest }: { className?: string } & Record<`data-${string}`, string | boolean | undefined>) {
  const market = useMarket();
  const now = useNowMinute();
  const m = market.data;
  const top = useMemo(() => (m ? highlights(m.quotes).slice(0, 2) : []), [m]);

  const actions = (
    <Link href="/mercado" className="text-xs text-muted hover:text-fg">
      Abrir mercado <ArrowRight className="inline size-3" />
    </Link>
  );
  const title = (
    <span className="inline-flex items-center gap-2">
      <Globe className="size-4 text-subtle" /> Mercado agora
    </span>
  );

  if (!m) {
    return (
      <Panel title={title} actions={actions} className={className} {...rest}>
        {market.isPending ? <div className="skeleton h-28 rounded-xl" /> : <p className="py-4 text-center text-sm text-muted">Cotações indisponíveis no momento.</p>}
      </Panel>
    );
  }

  const keyQuotes = KEY_SYMBOLS.map((s) => m.quotes.find((q) => q.symbol === s)).filter((q) => q !== undefined).slice(0, 6);
  const at = Date.parse(m.fetchedAt);

  return (
    <Panel title={title} subtitle={m.mode === "snapshot" ? "Retrato coletado para a demonstração" : "Bolsa, câmbio e cripto, com as notícias do momento"} actions={actions} className={className} data-testid="market-widget" {...rest}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
          {keyQuotes.map((q) => (
            <li key={q.symbol} className="rounded-lg border border-line bg-white/[0.02] px-3 py-2">
              <p className="mono text-[11px] text-subtle">{q.symbol}</p>
              <p className="num text-sm font-semibold text-fg">{formatQuotePrice(q)}</p>
              <p className={cn("num text-xs font-semibold", toneText(q.changePct))}>{formatChange(q.changePct)}</p>
            </li>
          ))}
        </ul>
        <div className="min-w-0">
          {top.length > 0 ? (
            <ul className="space-y-3">
              {top.map((h) => {
                const label = h.kind === "asset" ? `${h.move.quote.name} ${formatChange(h.move.quote.changePct)}` : `${QUOTE_CATEGORY_LABELS[h.category]} ${h.direction === "up" ? "em alta" : "em queda"}`;
                const news = (h.kind === "asset" ? relatedNews(h.move.quote, m.news, at, 1) : topicNews(h.category, m.news, at, 1))[0];
                const up = (h.kind === "asset" ? h.move.direction : h.direction) === "up";
                return (
                  <li key={label}>
                    <p className={cn("text-[13px] font-semibold", up ? "text-pos" : "text-neg")}>{label}</p>
                    {news ? <NewsLink item={news} now={now} compact /> : <p className="text-xs text-muted">Sem manchete recente sobre este movimento.</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="divide-y divide-line">
              {m.news.slice(0, 3).map((n) => (
                <NewsLink key={n.id} item={n} now={now} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
