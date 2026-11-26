"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Info, Newspaper, RefreshCw, Search, ServerCrash, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Panel } from "@/components/ui/misc";
import { useReadyData } from "@/hooks/app-data";
import { useNowMinute } from "@/hooks/use-client-store";
import { ApiClientError } from "@/lib/api/client";
import { useExplainMarket, useMarket } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { formatDateTime, formatTime } from "@/lib/domain/dates";
import { gsap, shouldReduceMotion, useGSAP } from "@/lib/gsap";
import type { ExplanationResult } from "@/lib/market/explain";
import { formatChange, formatQuotePrice } from "@/lib/market/format";
import { breadth, highlights, MOVE_THRESHOLD, relatedNews, topicNews, type Highlight } from "@/lib/market/movers";
import { normalize } from "@/lib/market/text";
import { NEWS_TOPIC_LABELS, NEWS_TOPICS, QUOTE_CATEGORIES, QUOTE_CATEGORY_LABELS, type MarketSnapshot, type NewsTopic, type Quote } from "@/lib/market/types";
import { ChangePill, NewsLink, QuoteCard, safeUrl, toneText } from "./market-bits";

/* --------------------------------- Ticker tape -------------------------------- */

function TickerTape({ quotes }: { quotes: Quote[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [still] = useState(() => shouldReduceMotion());
  const items = quotes.filter((q) => q.changePct !== null);

  useGSAP(
    () => {
      const root = ref.current;
      const track = root?.querySelector<HTMLElement>("[data-track]");
      if (!root || !track || still) return;
      const distance = track.scrollWidth / 2;
      const tween = gsap.to(track, { x: -distance, duration: distance / 45, ease: "none", repeat: -1 });
      const pause = () => tween.timeScale(0.15);
      const resume = () => tween.timeScale(1);
      root.addEventListener("pointerenter", pause);
      root.addEventListener("pointerleave", resume);
      return () => {
        root.removeEventListener("pointerenter", pause);
        root.removeEventListener("pointerleave", resume);
      };
    },
    { scope: ref, dependencies: [items.length, still] },
  );

  if (!items.length) return null;
  const row = (copy: number) =>
    items.map((q) => (
      <span key={`${copy}-${q.symbol}`} className="inline-flex items-center gap-2 px-4 text-xs whitespace-nowrap" aria-hidden={copy === 1 || undefined}>
        <span className="mono text-subtle">{q.symbol}</span>
        <span className="num text-fg">{formatQuotePrice(q)}</span>
        <span className={cn("num font-semibold", toneText(q.changePct))}>{formatChange(q.changePct)}</span>
      </span>
    ));
  return (
    <div
      ref={ref}
      className={cn("glass relative mb-4 rounded-xl py-2.5", still ? "overflow-x-auto" : "overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]")}
      data-testid="market-ticker"
      aria-label="Cotações acompanhadas"
    >
      <div data-track className="flex w-max divide-x divide-line">
        {row(0)}
        {!still && row(1)}
      </div>
    </div>
  );
}

/* --------------------------------- Highlights -------------------------------- */

function HighlightCard({ h, market, now, onExplain, canExplain }: { h: Highlight; market: MarketSnapshot; now: number; onExplain: (focus: string | null) => void; canExplain: boolean }) {
  const at = Date.parse(market.fetchedAt);
  const up = (h.kind === "asset" ? h.move.direction : h.direction) === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const news = h.kind === "asset" ? relatedNews(h.move.quote, market.news, at) : topicNews(h.category, market.news, at);
  const title =
    h.kind === "asset"
      ? h.move.quote.name
      : `${QUOTE_CATEGORY_LABELS[h.category]} ${up ? "em alta" : "em queda"} generalizada`;

  return (
    <li className="rounded-xl border border-line bg-white/[0.02] p-4" data-testid="highlight">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", up ? "border-pos/30 bg-pos/10 text-pos" : "border-neg/30 bg-neg/10 text-neg")}>
            <Icon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{title}</p>
            {h.kind === "asset" ? (
              <p className="text-xs text-muted">
                <span className="num">{formatQuotePrice(h.move.quote)}</span> · {h.move.quote.changeLabel}
              </p>
            ) : (
              <p className="text-xs text-muted">
                {h.moves.length} de {h.total} ativos {up ? "sobem" : "caem"} mais de {String(MOVE_THRESHOLD[h.category]).replace(".", ",")}% {h.moves[0].quote.changeLabel}
              </p>
            )}
          </div>
        </div>
        {h.kind === "asset" ? (
          <ChangePill value={h.move.quote.changePct} className="text-sm" />
        ) : (
          <div className="flex max-w-full flex-wrap gap-1">
            {h.moves.slice(0, 6).map((m) => (
              <span key={m.quote.symbol} className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11px]">
                <span className="mono text-muted">{m.quote.symbol}</span>
                <span className={cn("num font-semibold", toneText(m.quote.changePct))}>{formatChange(m.quote.changePct)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-line pt-2">
        <p className="label-caps">Por que? O que as manchetes dizem</p>
        {news.length ? (
          <div className="divide-y divide-line">
            {news.map((n) => (
              <NewsLink key={n.id} item={n} now={now} compact />
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            Nenhuma manchete recente cita {h.kind === "asset" ? h.move.quote.name : "esse mercado"}. O movimento pode ainda não ter sido noticiado pelas fontes acompanhadas.
          </p>
        )}
      </div>
      {canExplain && (
        <button
          type="button"
          onClick={() => onExplain(h.kind === "asset" ? h.move.quote.symbol : null)}
          className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-info hover:underline"
        >
          <Sparkles className="size-3.5" /> Explicar este movimento com IA
        </button>
      )}
    </li>
  );
}

/* ---------------------------------- AI panel --------------------------------- */

const DIRECTION_TONE = { alta: "pos", queda: "neg", misto: "neutral" } as const;
const CONFIDENCE = { alta: "alta", media: "média", baixa: "baixa" } as const;

function AiExplanation({ result, tz }: { result: ExplanationResult; tz: string }) {
  const { explanation: e, headlines } = result;
  return (
    <div data-testid="ai-result">
      <p className="text-sm leading-relaxed text-fg">{e.overview}</p>
      {e.drivers.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {e.drivers.map((d, i) => (
            <li key={i} className="rounded-lg border border-line bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={DIRECTION_TONE[d.direction]}>{d.direction}</Badge>
                <span className="text-[13px] font-semibold text-fg">{d.asset}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                {d.explanation}{" "}
                {d.sources.map((n) => {
                  const h = headlines[n - 1];
                  return (
                    <a key={n} href={h ? safeUrl(h.url) : undefined} target="_blank" rel="noopener noreferrer" title={h ? `${h.source}: ${h.title}` : undefined} className="mono ml-0.5 text-[11px] text-info hover:underline">
                      [{n}]
                    </a>
                  );
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
      {e.caveat && (
        <p className="mt-3 flex gap-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0 text-subtle" /> {e.caveat}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-subtle">
        <Badge tone={e.confidence === "alta" ? "pos" : e.confidence === "media" ? "warn" : "neutral"}>Confiança {CONFIDENCE[e.confidence]}</Badge>
        <span>
          {result.engine} · {formatTime(result.generatedAt, tz)} · {headlines.length} manchetes
        </span>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted hover:text-fg">Manchetes usadas</summary>
        <ol className="mt-1.5 space-y-1">
          {headlines.map((h, i) => (
            <li key={h.id} className="text-muted">
              <span className="mono text-subtle">[{i + 1}]</span>{" "}
              <a href={safeUrl(h.url)} target="_blank" rel="noopener noreferrer" className="hover:text-fg hover:underline">
                {h.title}
              </a>{" "}
              <span className="text-subtle">— {h.source}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function AiPanel({ market, tz, explain, focus, onExplain }: { market: MarketSnapshot; tz: string; explain: ReturnType<typeof useExplainMarket>; focus: string | null; onExplain: (f: string | null) => void }) {
  const focusName = focus ? market.quotes.find((q) => q.symbol === focus)?.name : null;
  const err = explain.error;
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-info" /> Por que o mercado se moveu?
        </span>
      }
      subtitle={focusName ? `Explicação sobre ${focusName}` : "Resumo com IA, baseado apenas nas manchetes coletadas"}
      data-testid="market-ai"
    >
      {!market.aiAvailable ? (
        <p className="text-sm text-muted">A explicação com IA não está ativa aqui. As manchetes ligadas a cada movimento continuam ao lado.</p>
      ) : (
        <>
          <AnimatePresence mode="wait" initial={false}>
            {explain.isPending ? (
              <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2" aria-live="polite">
                <p className="text-xs text-muted">Lendo as manchetes e as cotações…</p>
                <div className="skeleton h-4 rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <div className="skeleton h-16 rounded-lg" />
              </motion.div>
            ) : explain.data ? (
              <motion.div key={explain.data.generatedAt + (focus ?? "")} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <AiExplanation result={explain.data} tz={tz} />
              </motion.div>
            ) : (
              <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-muted">
                A IA lê as cotações e as manchetes deste momento e explica o que a imprensa associa a cada alta ou queda, citando as fontes. Ela não prevê preços nem recomenda operações.
              </motion.p>
            )}
          </AnimatePresence>
          {err && (
            <p className="mt-3 flex gap-2 text-xs text-neg" role="alert">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {err instanceof ApiClientError ? err.message : "Não foi possível gerar a explicação."}
            </p>
          )}
          <Button className="mt-4 w-full" variant="secondary" icon={<Sparkles className="size-4" />} loading={explain.isPending} onClick={() => onExplain(null)} data-testid="explain-market">
            {explain.data ? "Explicar de novo" : "Explicar o mercado agora"}
          </Button>
          <p className="mt-2 text-[11px] text-subtle">Pode conter erros. Confira nas fontes. Não é recomendação de investimento.</p>
        </>
      )}
    </Panel>
  );
}

/* ----------------------------------- News ------------------------------------ */

function NewsFeed({ market, now }: { market: MarketSnapshot; now: number }) {
  const [topic, setTopic] = useState<NewsTopic | "all">("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(25);
  const counts = useMemo(() => Object.fromEntries(NEWS_TOPICS.map((t) => [t, market.news.filter((n) => n.topics.includes(t)).length])) as Record<NewsTopic, number>, [market.news]);
  const q = normalize(query);
  const list = market.news.filter((n) => (topic === "all" || n.topics.includes(topic)) && (!q || normalize(`${n.title} ${n.summary} ${n.source}`).includes(q)));

  return (
    <Panel
      className="xl:col-span-2"
      title={
        <span className="inline-flex items-center gap-2">
          <Newspaper className="size-4 text-subtle" /> Notícias do mercado
        </span>
      }
      subtitle={`${market.news.length} manchetes recentes de veículos de economia · clique para ler no site original`}
      bodyClassName="px-3 sm:px-4"
    >
      <div className="flex flex-wrap items-center gap-2 px-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por tema">
          {(["all", ...NEWS_TOPICS] as const)
            .filter((t) => t === "all" || counts[t] > 0)
            .map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={topic === t}
                onClick={() => {
                  setTopic(t);
                  setLimit(25);
                }}
                className={cn("focus-ring h-7 rounded-md border px-2.5 text-xs transition-colors", topic === t ? "border-white/20 bg-white/[0.09] text-fg" : "border-line text-muted hover:text-fg")}
              >
                {t === "all" ? "Todas" : NEWS_TOPIC_LABELS[t]} <span className="num text-subtle">{t === "all" ? market.news.length : counts[t]}</span>
              </button>
            ))}
        </div>
        <label className="relative ml-auto w-full sm:w-56">
          <span className="sr-only">Buscar nas notícias</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar (ex.: Petrobras, Copom)"
            className="h-8 w-full rounded-lg border border-line bg-white/[0.03] pr-2 pl-8 text-xs text-fg outline-none placeholder:text-subtle focus:border-white/25"
          />
        </label>
      </div>
      {list.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-muted">Nenhuma manchete com esse filtro.</p>
      ) : (
        <div className="mt-1 divide-y divide-line px-2" data-testid="news-feed">
          {list.slice(0, limit).map((n) => (
            <NewsLink key={n.id} item={n} now={now} />
          ))}
        </div>
      )}
      {list.length > limit && (
        <div className="px-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + 25)}>
            Mostrar mais ({list.length - limit})
          </Button>
        </div>
      )}
    </Panel>
  );
}

function SourcesPanel({ market, tz }: { market: MarketSnapshot; tz: string }) {
  return (
    <Panel title="Fontes" subtitle="Serviços públicos e feeds oficiais dos veículos; nenhum login" data-testid="market-sources">
      <ul className="space-y-2 text-xs">
        {market.sources.map((s) => (
          <li key={s.id} className="flex items-start gap-2">
            <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", s.ok ? "bg-pos" : "bg-neg")} aria-hidden />
            <div className="min-w-0">
              <p className="text-fg">
                {s.label} <span className="text-subtle">· {s.count}</span>
              </p>
              <p className={cn(s.ok ? "text-subtle" : "text-neg")}>
                {s.ok ? (s.updatedAt ? `Atualizado às ${formatTime(s.updatedAt, tz)}` : "Sem dados") : `${s.error ?? "Falhou"}${s.updatedAt ? ` · mostrando dados das ${formatTime(s.updatedAt, tz)}` : ""}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {market.hints.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs text-muted">
          {market.hints.map((h) => (
            <li key={h} className="flex gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-subtle" /> {h}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------ Page ----------------------------------- */

function MarketContent() {
  const { settings } = useReadyData();
  const tz = settings.timezone;
  const market = useMarket();
  const explain = useExplainMarket();
  const [focus, setFocus] = useState<string | null>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const now = useNowMinute();

  const m = market.data;
  const marks = useMemo(() => (m ? highlights(m.quotes) : []), [m]);

  if (market.isPending) {
    return (
      <>
        <PageHeader title="Mercado ao vivo" description="Carregando cotações e notícias…" />
        <div className="skeleton mb-4 h-10 rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="skeleton h-72 rounded-2xl xl:col-span-2" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      </>
    );
  }
  if (!m) {
    return (
      <>
        <PageHeader title="Mercado ao vivo" />
        <div className="glass rounded-2xl">
          <EmptyState
            icon={<ServerCrash className="size-5" />}
            title="Não foi possível carregar o mercado"
            description={market.error instanceof ApiClientError ? market.error.message : "Tente novamente em instantes."}
            action={
              <Button variant="secondary" onClick={() => market.refetch()} icon={<RefreshCw className="size-4" />}>
                Tentar de novo
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const b = breadth(m.quotes);
  const runExplain = (f: string | null) => {
    setFocus(f);
    explain.mutate(f);
    aiRef.current?.scrollIntoView({ behavior: shouldReduceMotion() ? "auto" : "smooth", block: "nearest" });
  };

  return (
    <>
      <PageHeader
        title="Mercado ao vivo"
        description="O que está acontecendo agora na bolsa, no câmbio e em cripto, e as manchetes que explicam cada alta ou queda. Informativo: não é recomendação."
        actions={
          <>
            {m.mode === "live" ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-xs text-muted" data-testid="market-live">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-pos/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-pos" />
                </span>
                Ao vivo · {formatTime(m.fetchedAt, tz)}
              </span>
            ) : (
              <Badge tone="warn">Retrato de {formatDateTime(m.fetchedAt, tz)}</Badge>
            )}
            <Button variant="ghost" size="sm" icon={<RefreshCw className={cn("size-4", market.isFetching && "animate-spin")} />} onClick={() => market.refetch()} aria-label="Atualizar agora">
              Atualizar
            </Button>
          </>
        }
      />

      {m.mode === "snapshot" && (
        <div className="mb-4 flex gap-3 rounded-xl border border-warn/30 bg-warn/[0.06] p-3 text-xs text-muted" data-testid="market-snapshot-note">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>
            Esta demonstração não tem servidor para consultar as fontes, então mostra cotações e manchetes <strong className="text-fg">reais coletadas em {formatDateTime(m.fetchedAt, tz)}</strong>{" "}
            e não se atualiza. Na versão instalada, tudo é atualizado a cada minuto.
          </p>
        </div>
      )}

      <TickerTape quotes={m.quotes} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="O que está movendo o mercado"
          subtitle={`${b.up} ativos em alta · ${b.down} em queda · ${b.flat} estáveis entre os acompanhados`}
          data-testid="market-highlights"
        >
          {marks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nenhum ativo acompanhado tem movimento forte agora. As notícias do dia estão abaixo.</p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {marks.slice(0, 6).map((h) => (
                <HighlightCard key={h.kind === "asset" ? h.move.quote.symbol : `${h.category}-${h.direction}`} h={h} market={m} now={now} onExplain={runExplain} canExplain={m.aiAvailable} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-subtle">
            Destaques: índices acima de 1%, ações acima de 2%, câmbio acima de 0,6% e cripto acima de 3%. As manchetes são as que citam o ativo; isso não prova que causaram o movimento.
          </p>
        </Panel>
        <div ref={aiRef}>
          <AiPanel market={m} tz={tz} explain={explain} focus={focus} onExplain={runExplain} />
        </div>

        <section className="xl:col-span-3" aria-label="Cotações">
          {QUOTE_CATEGORIES.map((cat) => {
            const list = m.quotes.filter((q) => q.category === cat);
            if (!list.length) return null;
            return (
              <div key={cat} className="mb-4">
                <h2 className="label-caps mb-2 px-1">{QUOTE_CATEGORY_LABELS[cat]}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                  {list.map((q) => (
                    <QuoteCard key={q.symbol} quote={q} tz={tz} now={now} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <NewsFeed market={m} now={now} />
        <SourcesPanel market={m} tz={tz} />
      </div>

      <p className="mt-6 text-center text-[11px] text-subtle">
        Cotações de fontes públicas, que podem ter atraso. As manchetes pertencem aos veículos citados. Este painel não executa ordens, não prevê preços e não recomenda operações.
      </p>
    </>
  );
}

export function MarketView() {
  return (
    <DataGate>
      <MarketContent />
    </DataGate>
  );
}
