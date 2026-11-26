"use client";

import { Info, Plus, Equal } from "lucide-react";
import { Panel } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import {
  findCandlePattern,
  findChartPattern,
  SETUP_PAIRS,
  type SetupSide,
} from "@/lib/academy/patterns";
import { CandlesSvg, ChartPatternSvg } from "./visuals";

function SetupCell({ side, tone }: { side: SetupSide; tone: "pos" | "neg" }) {
  const candle = findCandlePattern(side.candle)!;
  const chart =
    side.chart === "suporte" || side.chart === "resistencia"
      ? side.chart
      : findChartPattern(side.chart)!;
  const focus = candle.candles.slice(-(candle.candlesCount + 1));
  return (
    <div className="p-3 sm:p-4" data-testid="setup">
      <div className="grid grid-cols-[1.2fr_auto_0.9fr_auto_1fr] items-center gap-1.5 sm:gap-2">
        <figure className="h-20 rounded-lg bg-white/[0.02] p-1">
          <ChartPatternSvg pattern={chart} compact />
        </figure>
        <Plus className="size-4 text-subtle" aria-hidden />
        <figure className="h-20 rounded-lg bg-white/[0.02] p-1.5">
          <CandlesSvg candles={focus} focusFrom={1} label={candle.name} />
        </figure>
        <Equal className="size-4 text-subtle" aria-hidden />
        <p
          className={cn(
            "text-[13px] leading-tight font-semibold",
            tone === "pos" ? "text-pos" : "text-neg",
          )}
        >
          {side.title}
          <span className="mt-1 block text-[11px] font-normal text-subtle">
            {tone === "pos" ? "possível alta" : "possível queda"}
          </span>
        </p>
      </div>
      <div className="mt-2.5 grid gap-0.5 text-xs text-muted">
        <p>
          <span className="text-fg/80">Confirma:</span> {side.confirm}
        </p>
        <p>
          <span className="text-fg/80">Invalida:</span> {side.invalid}
        </p>
      </div>
    </div>
  );
}

export function BuySellTab() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <section
        className="glass overflow-hidden rounded-2xl"
        data-testid="buy-sell"
      >
        <div className="grid grid-cols-2">
          <h2 className="bg-pos/15 py-3 text-center text-xl font-bold tracking-wider text-pos sm:text-2xl">
            COMPRA
          </h2>
          <h2 className="bg-neg/15 py-3 text-center text-xl font-bold tracking-wider text-neg sm:text-2xl">
            VENDA
          </h2>
        </div>
        <div className="grid grid-cols-2 border-b border-line text-center text-[11px] text-subtle">
          <p className="py-1.5">Sinais de que a queda pode virar alta</p>
          <p className="border-l border-line py-1.5">
            Sinais de que a alta pode virar queda
          </p>
        </div>
        {SETUP_PAIRS.map((pair) => (
          <div
            key={pair.buy.title}
            className="grid border-b border-line last:border-b-0 md:grid-cols-2"
          >
            <div className="border-l-2 border-pos/40">
              <SetupCell side={pair.buy} tone="pos" />
            </div>
            <div className="border-t border-l-2 border-line border-l-neg/40 md:border-t-0">
              <SetupCell side={pair.sell} tone="neg" />
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Como ler a tabela">
          <p className="text-sm leading-relaxed text-muted">
            Cada linha junta um <strong className="text-fg">lugar</strong>{" "}
            (suporte, resistência ou formação gráfica) com um{" "}
            <strong className="text-fg">gatilho</strong> (o padrão de velas). O
            sinal só existe quando os dois aparecem juntos e o candle seguinte
            confirma.
          </p>
        </Panel>
        <Panel title="Por que não há estrelas de força">
          <p className="text-sm leading-relaxed text-muted">
            Não existe estatística confiável de acerto para esses padrões em
            tempos de 1 a 5 minutos. Uma nota de 5 estrelas daria uma segurança
            que o mercado não dá. A força vem de três coisas que você confere:
            tendência anterior, nível importante e confirmação.
          </p>
        </Panel>
        <Panel title="O que fica de fora">
          <p className="flex gap-2 text-sm leading-relaxed text-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-subtle" />
            Combinações com horário fixo (&quot;hora de Londres + vela X&quot;)
            e nomes que não existem na análise técnica não entram aqui. Horário
            influencia volume e volatilidade, não a direção do preço; veja a aba
            Tempos e sessões.
          </p>
        </Panel>
      </div>
    </div>
  );
}
