"use client";

import { Check, X } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Panel } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import {
  CANDLE_PATTERNS,
  CHART_PATTERNS,
  KIND_LABELS,
  kindBias,
  type CandlePattern,
  type PatternKind,
} from "@/lib/academy/patterns";
import { shouldReduceMotion } from "@/lib/gsap";
import { Candles3D, CandlesSvg, ChartPatternSvg } from "./visuals";

type Filter = "todos" | "alta" | "baixa" | "outros";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "alta", label: "Sinais de alta" },
  { value: "baixa", label: "Sinais de baixa" },
  { value: "outros", label: "Indecisão" },
];

export const kindTone = (k: PatternKind) =>
  kindBias(k) === "alta" ? "pos" : kindBias(k) === "baixa" ? "neg" : "neutral";

function PatternDetail({ p }: { p: CandlePattern }) {
  return (
    <div data-testid="pattern-detail">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-fg">{p.name}</h3>
        <span className="text-xs text-subtle">{p.en}</span>
        <Badge tone={kindTone(p.kind)}>{KIND_LABELS[p.kind]}</Badge>
        <Badge>
          {p.candlesCount === 1 ? "1 vela" : `${p.candlesCount} velas`}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{p.meaning}</p>
      <p className="label-caps mt-4">Como reconhecer</p>
      <ul className="mt-1.5 space-y-1 text-[13px] text-fg/90">
        {p.recognize.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-subtle" />
            {r}
          </li>
        ))}
      </ul>
      <p className="label-caps mt-4">Onde tem valor</p>
      <p className="mt-1 text-[13px] text-muted">{p.where}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-pos/25 bg-pos/[0.05] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-pos">
            <Check className="size-3.5" /> Confirma quando
          </p>
          <p className="mt-1 text-[13px] text-fg/90">{p.confirm}</p>
        </div>
        <div className="rounded-lg border border-neg/25 bg-neg/[0.05] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-neg">
            <X className="size-3.5" /> Perde a validade quando
          </p>
          <p className="mt-1 text-[13px] text-fg/90">{p.invalid}</p>
        </div>
      </div>
    </div>
  );
}

export function PatternsTab() {
  const [selected, setSelected] = useState(CANDLE_PATTERNS[0]);
  const [filter, setFilter] = useState<Filter>("todos");
  const viewerRef = useRef<HTMLDivElement>(null);
  const list = CANDLE_PATTERNS.filter(
    (p) =>
      filter === "todos" ||
      (filter === "outros"
        ? kindBias(p.kind) === "neutro"
        : kindBias(p.kind) === filter),
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <div
        ref={viewerRef}
        className="grid scroll-mt-24 grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]"
      >
        <Panel
          title="Padrão em 3D"
          subtitle="As velas apagadas mostram o que veio antes; o padrão aparece aceso"
        >
          <Candles3D
            candles={selected.candles}
            focusFrom={selected.candles.length - selected.candlesCount}
            label={`${selected.name} em 3D`}
            height={400}
          />
        </Panel>
        <Panel>
          <PatternDetail p={selected} />
        </Panel>
      </div>

      <Panel
        title="Padrões de velas"
        subtitle={`${CANDLE_PATTERNS.length} padrões clássicos da análise técnica. Toque em um para ver em 3D.`}
      >
        <div
          className="mb-3 flex flex-wrap gap-1"
          role="group"
          aria-label="Filtrar padrões"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "focus-ring h-7 rounded-md border px-2.5 text-xs",
                filter === f.value
                  ? "border-white/20 bg-white/[0.09] text-fg"
                  : "border-line text-muted hover:text-fg",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ul
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          data-testid="pattern-grid"
        >
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(p);
                  viewerRef.current?.scrollIntoView({
                    behavior: shouldReduceMotion() ? "auto" : "smooth",
                    block: "start",
                  });
                }}
                aria-pressed={selected.id === p.id}
                className={cn(
                  "focus-ring group w-full rounded-xl border bg-white/[0.02] p-3 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong",
                  selected.id === p.id ? "border-white/25" : "border-line",
                )}
                data-testid={`pattern-${p.id}`}
              >
                <div className="h-24">
                  <CandlesSvg
                    candles={p.candles}
                    focusFrom={p.candles.length - p.candlesCount}
                    label={p.name}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-fg">{p.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      kindTone(p.kind) === "pos"
                        ? "bg-pos"
                        : kindTone(p.kind) === "neg"
                          ? "bg-neg"
                          : "bg-muted",
                    )}
                  />
                  {KIND_LABELS[p.kind]}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Formações gráficas"
        subtitle="Desenhos que o preço forma ao longo de muitas velas. Elas mostram onde as velas acima ganham força."
      >
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CHART_PATTERNS.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-line bg-white/[0.02] p-3"
            >
              <div className="h-28">
                <ChartPatternSvg pattern={c} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-fg">{c.name}</p>
                <Badge tone={kindTone(c.kind)}>{KIND_LABELS[c.kind]}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {c.recognize}
              </p>
              <p className="mt-1.5 text-xs text-fg/90">
                <span className="text-pos">Confirma:</span> {c.confirm}
              </p>
              <p className="text-xs text-fg/90">
                <span className="text-neg">Invalida:</span> {c.invalid}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
