"use client";

import { useMemo, useState } from "react";
import { Badge, Panel } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import {
  CANDLE_PRESETS as PRESETS,
  normalizeCandle,
  parts,
  readCandle,
  type Ohlc,
} from "@/lib/academy/candles";
import { Candles3D } from "./visuals";

const CONTEXT: Ohlc[] = [
  { o: 99, h: 100.6, l: 97.6, c: 98.4 },
  { o: 98.4, h: 100.4, l: 97.8, c: 99.6 },
];

const FIELDS: { key: keyof Ohlc; label: string; help: string }[] = [
  { key: "o", label: "Abertura", help: "Primeiro preço do período" },
  { key: "h", label: "Máxima", help: "Preço mais alto alcançado" },
  { key: "l", label: "Mínima", help: "Preço mais baixo alcançado" },
  { key: "c", label: "Fechamento", help: "Último preço do período" },
];

const BIAS = {
  alta: { tone: "pos", label: "Viés de alta" },
  baixa: { tone: "neg", label: "Viés de baixa" },
  indecisao: { tone: "neutral", label: "Indecisão" },
} as const;

function Bar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="num">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            color,
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function AnatomyTab() {
  const [k, setK] = useState<Ohlc>(PRESETS[2].k);
  const reading = readCandle(k);
  const p = parts(k);
  const candles = useMemo(() => [...CONTEXT, k], [k]);
  const set = (key: keyof Ohlc, v: number) => {
    setK((prev) => {
      const next = { ...prev, [key]: v };
      // Keep the candle valid: the wicks follow the body when it moves past them.
      if (key === "h") next.h = Math.max(v, prev.o, prev.c);
      if (key === "l") next.l = Math.min(v, prev.o, prev.c);
      return normalizeCandle(next);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
      <Panel
        title="A vela em 3D"
        subtitle="Mexa nos preços ao lado ou escolha um formato: a vela muda na hora e o painel explica o que ela diz"
      >
        <Candles3D
          candles={candles}
          focusFrom={CONTEXT.length}
          anatomy
          animateChanges={false}
          height={420}
          label={`Vela em 3D: ${reading.name}`}
        />
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Formatos prontos"
        >
          {PRESETS.map((pr) => (
            <button
              key={pr.label}
              type="button"
              onClick={() => setK(pr.k)}
              className="focus-ring h-7 rounded-md border border-line px-2.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {pr.label}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid min-w-0 content-start gap-4">
        <Panel title="O que esta vela diz" data-testid="candle-reading">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="text-lg font-semibold text-fg"
              data-testid="candle-name"
            >
              {reading.name}
            </p>
            <Badge tone={BIAS[reading.bias].tone}>
              {BIAS[reading.bias].label}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {reading.meaning}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-subtle">
            {reading.context}
          </p>
          <div className="mt-4 grid gap-2.5">
            <Bar
              label="Corpo"
              pct={p.range ? (p.body / p.range) * 100 : 0}
              color={p.bullish ? "bg-pos" : "bg-neg"}
            />
            <Bar
              label="Pavio superior"
              pct={p.range ? (p.upper / p.range) * 100 : 0}
              color="bg-white/40"
            />
            <Bar
              label="Pavio inferior"
              pct={p.range ? (p.lower / p.range) * 100 : 0}
              color="bg-white/40"
            />
          </div>
        </Panel>

        <Panel
          title="Monte a sua vela"
          subtitle="Preços de exemplo, de 90 a 110"
        >
          <div className="grid gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="grid gap-1">
                <span className="flex justify-between text-xs">
                  <span className="text-fg">{f.label}</span>
                  <span className="num text-muted">
                    {k[f.key].toFixed(1).replace(".", ",")}
                  </span>
                </span>
                <input
                  type="range"
                  min={90}
                  max={110}
                  step={0.1}
                  value={k[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                  className="w-full accent-[var(--color-pos)]"
                  aria-describedby={`help-${f.key}`}
                  data-testid={`ohlc-${f.key}`}
                />
                <span id={`help-${f.key}`} className="text-[11px] text-subtle">
                  {f.help}
                </span>
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
        {[
          {
            t: "Corpo",
            d: "A distância entre a abertura e o fechamento. Corpo grande = um lado dominou. Corpo pequeno = equilíbrio ou indecisão.",
          },
          {
            t: "Cor",
            d: "Verde: fechou acima da abertura (compradores venceram o período). Vermelha: fechou abaixo (vendedores venceram).",
          },
          {
            t: "Pavio (sombra)",
            d: "Mostra até onde o preço foi e voltou. Um pavio longo é um preço que foi rejeitado: o mercado testou aquele nível e não aceitou ficar lá.",
          },
          {
            t: "Período",
            d: "Cada vela resume um tempo: 1 minuto no M1, 5 minutos no M5, um dia no diário. A mesma vela em tempos diferentes conta histórias diferentes.",
          },
        ].map((c) => (
          <Panel key={c.t} title={c.t}>
            <p className="text-sm leading-relaxed text-muted">{c.d}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
