"use client";

import { ArrowRight, BookOpen, Check, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Panel } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { CANDLE_PATTERNS, KIND_LABELS } from "@/lib/academy/patterns";
import { kindTone } from "./tab-patterns";
import { CandlesSvg, ChartPatternSvg } from "./visuals";

/* ----------------------------- Knowing the market ---------------------------- */

const TREND = {
  alta: {
    path: [
      [0, 20],
      [18, 46],
      [28, 36],
      [46, 64],
      [56, 54],
      [76, 82],
      [86, 74],
      [100, 92],
    ] as [number, number][],
    label: "Topos e fundos cada vez mais altos",
  },
  baixa: {
    path: [
      [0, 86],
      [18, 58],
      [28, 68],
      [46, 40],
      [56, 50],
      [76, 22],
      [86, 30],
      [100, 10],
    ] as [number, number][],
    label: "Topos e fundos cada vez mais baixos",
  },
  lateral: {
    path: [
      [0, 40],
      [14, 66],
      [28, 36],
      [42, 64],
      [56, 38],
      [70, 66],
      [84, 36],
      [100, 60],
    ] as [number, number][],
    label: "Preço preso entre um piso e um teto",
  },
};

function Trend({ kind }: { kind: keyof typeof TREND }) {
  const t = TREND[kind];
  const X = (v: number) => 6 + v * 1.68;
  const Y = (v: number) => 6 + (100 - v) * 0.88;
  const color =
    kind === "alta"
      ? "var(--color-pos)"
      : kind === "baixa"
        ? "var(--color-neg)"
        : "var(--color-info)";
  return (
    <svg
      viewBox="0 0 180 100"
      className="h-24 w-full"
      role="img"
      aria-label={t.label}
    >
      {kind === "lateral" && (
        <>
          <line
            x1={X(0)}
            x2={X(100)}
            y1={Y(68)}
            y2={Y(68)}
            stroke="var(--color-muted)"
            strokeDasharray="4 4"
          />
          <line
            x1={X(0)}
            x2={X(100)}
            y1={Y(34)}
            y2={Y(34)}
            stroke="var(--color-muted)"
            strokeDasharray="4 4"
          />
        </>
      )}
      <polyline
        points={t.path.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MarketKnowledgeTab() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(
          [
            [
              "alta",
              "Tendência de alta",
              "Cada fundo fica acima do anterior. Os sinais de compra em suporte funcionam melhor; vender contra a tendência é nadar contra a correnteza.",
            ],
            [
              "baixa",
              "Tendência de baixa",
              "Cada topo fica abaixo do anterior. Os sinais de venda em resistência funcionam melhor.",
            ],
            [
              "lateral",
              "Mercado lateral",
              "Sem direção. O preço vai e volta entre piso e teto; padrões no meio do caminho valem pouco. Espere os extremos ou o rompimento.",
            ],
          ] as const
        ).map(([k, t, d]) => (
          <Panel key={k} title={t}>
            <Trend kind={k} />
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Suporte e resistência"
          subtitle="Os lugares onde as velas ganham importância"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-lg bg-white/[0.02] p-1">
              <ChartPatternSvg pattern="suporte" />
            </div>
            <div className="h-28 rounded-lg bg-white/[0.02] p-1">
              <ChartPatternSvg pattern="resistencia" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Suporte é um preço onde a queda parou mais de uma vez (há
            compradores esperando); resistência é onde a alta parou. Quanto mais
            vezes o nível foi respeitado, e em tempos gráficos maiores, mais
            forte ele é. Quando um suporte é rompido, costuma virar resistência,
            e o contrário também.
          </p>
        </Panel>

        <Panel title="Como conhecer o mercado que você opera">
          <ol className="space-y-2.5 text-[13px] leading-relaxed text-muted">
            {[
              "Escolha poucos ativos (2 ou 3) e acompanhe sempre os mesmos: cada um tem horário, ritmo e tamanho de vela próprios.",
              "Antes de operar, marque no gráfico de 15 minutos e de 1 hora os topos e fundos do dia anterior.",
              "Veja as notícias e a agenda do dia: juros, inflação e emprego dos EUA mexem com dólar, ouro e índices.",
              "Observe sem operar nos primeiros minutos da sessão e anote o que viu.",
              "Registre cada operação com o motivo da entrada. Depois de 50 ou mais, as Estatísticas mostram o que funciona para você.",
              "Treine na conta demo da corretora até seguir o plano sem pular etapas.",
            ].map((t, i) => (
              <li key={t} className="flex gap-2.5">
                <span className="num grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] text-fg">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/mercado" className="text-info hover:underline">
              Mercado ao vivo <ArrowRight className="inline size-3" />
            </Link>
            <Link href="/diario" className="text-info hover:underline">
              Diário de trading <ArrowRight className="inline size-3" />
            </Link>
            <Link href="/estatisticas" className="text-info hover:underline">
              Estatísticas <ArrowRight className="inline size-3" />
            </Link>
          </div>
        </Panel>
      </div>

      <Panel title="O que nenhuma vela faz" className="border-warn/25">
        <p className="text-sm leading-relaxed text-muted">
          Padrões de velas mostram como compradores e vendedores se comportaram;
          não dizem o que vai acontecer. O mesmo martelo funciona num dia e
          falha no outro. Quem dura no mercado não é quem acerta sempre, e sim
          quem perde pouco quando erra: valor fixo por operação, limite diário e
          disciplina para parar.
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------------ Quiz ----------------------------------- */

/** Small deterministic PRNG so a round depends only on its seed. */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const ROUND = 8;

function makeRound(seed: number) {
  const r = rng(seed);
  const pool = [...CANDLE_PATTERNS].sort(() => r() - 0.5).slice(0, ROUND);
  return pool.map((p) => {
    const others = CANDLE_PATTERNS.filter(
      (o) => o.id !== p.id && o.name !== p.name,
    )
      .sort(() => r() - 0.5)
      .slice(0, 3);
    const options = [p, ...others].sort(() => r() - 0.5);
    return { pattern: p, options };
  });
}

export function QuizTab() {
  const [seed, setSeed] = useState(7);
  const round = useMemo(() => makeRound(seed), [seed]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const done = index >= round.length;
  const q = round[Math.min(index, round.length - 1)];

  const restart = () => {
    setSeed((s) => s + 101);
    setIndex(0);
    setAnswer(null);
    setScore(0);
  };

  if (done) {
    return (
      <Panel title="Resultado do treino" data-testid="quiz-done">
        <p className="text-3xl font-semibold text-fg">
          {score} <span className="text-lg text-muted">de {round.length}</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          {score === round.length
            ? "Acertou tudo. Agora treine reconhecer esses padrões no gráfico real, com contexto."
            : "Reveja os padrões que errou na aba Padrões e tente de novo."}
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          icon={<RefreshCw className="size-4" />}
          onClick={restart}
        >
          Novo treino
        </Button>
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <BookOpen className="size-4 text-subtle" /> Qual é este padrão?
          </span>
        }
        subtitle={`Pergunta ${index + 1} de ${round.length} · ${score} acerto(s)`}
        data-testid="quiz"
      >
        <div className="h-48 rounded-xl border border-line bg-white/[0.02] p-3">
          <CandlesSvg
            candles={q.pattern.candles}
            focusFrom={q.pattern.candles.length - q.pattern.candlesCount}
            label="Padrão do treino"
          />
        </div>
        <p className="mt-2 text-xs text-subtle">
          As velas apagadas mostram o contexto; o padrão está nas velas acesas.
        </p>
      </Panel>
      <Panel title="Escolha uma resposta">
        <div className="grid gap-2">
          {q.options.map((o) => {
            const correct = o.id === q.pattern.id;
            const picked = answer === o.id;
            return (
              <button
                key={o.id}
                type="button"
                disabled={answer !== null}
                onClick={() => {
                  setAnswer(o.id);
                  if (correct) setScore((s) => s + 1);
                }}
                className={cn(
                  "focus-ring flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  answer === null
                    ? "border-line text-fg hover:border-line-strong hover:bg-white/[0.03]"
                    : correct
                      ? "border-pos/40 bg-pos/[0.08] text-pos"
                      : picked
                        ? "border-neg/40 bg-neg/[0.08] text-neg"
                        : "border-line text-subtle",
                )}
                data-testid="quiz-option"
              >
                {o.name}
                {answer !== null && correct && <Check className="size-4" />}
                {picked && !correct && <X className="size-4" />}
              </button>
            );
          })}
        </div>
        {answer !== null && (
          <div
            className="mt-3 rounded-lg border border-line bg-white/[0.02] p-3"
            data-testid="quiz-feedback"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-fg">{q.pattern.name}</p>
              <Badge tone={kindTone(q.pattern.kind)}>
                {KIND_LABELS[q.pattern.kind]}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-muted">{q.pattern.meaning}</p>
            <Button
              className="mt-3"
              size="sm"
              variant="primary"
              onClick={() => {
                setIndex((i) => i + 1);
                setAnswer(null);
              }}
              data-testid="quiz-next"
            >
              {index + 1 === round.length ? "Ver resultado" : "Próxima"}
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
