/** Candle anatomy and an automatic reading of a single candle (used by the academy). */

export interface Ohlc {
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface CandleParts {
  range: number;
  body: number;
  upper: number;
  lower: number;
  /** body / range (0–1). */
  bodyRatio: number;
  bullish: boolean;
}

export function parts(k: Ohlc): CandleParts {
  const range = Math.max(0, k.h - k.l);
  const body = Math.abs(k.c - k.o);
  const upper = Math.max(0, k.h - Math.max(k.o, k.c));
  const lower = Math.max(0, Math.min(k.o, k.c) - k.l);
  return {
    range,
    body,
    upper,
    lower,
    bodyRatio: range ? body / range : 0,
    bullish: k.c >= k.o,
  };
}

/** Keeps a candle consistent (high above, low below the body). */
export function normalizeCandle(k: Ohlc): Ohlc {
  return {
    o: k.o,
    c: k.c,
    h: Math.max(k.h, k.o, k.c),
    l: Math.min(k.l, k.o, k.c),
  };
}

export type CandleBias = "alta" | "baixa" | "indecisao";

export interface CandleReading {
  name: string;
  bias: CandleBias;
  /** What the shape says about buyers and sellers. */
  meaning: string;
  /** Where the shape matters (it changes meaning with context). */
  context: string;
}

/**
 * Names the shape of one candle. Shapes such as the hammer and the hanging man
 * are identical: what separates them is where they appear, so the reading says so.
 */
export function readCandle(k: Ohlc): CandleReading {
  const p = parts(normalizeCandle(k));
  if (p.range === 0) {
    return {
      name: "Sem variação",
      bias: "indecisao",
      meaning:
        "Abertura, máxima, mínima e fechamento no mesmo preço: ninguém moveu o mercado nesse período.",
      context: "Comum em ativos sem liquidez ou fora do horário de negociação.",
    };
  }
  const side = p.bullish ? "alta" : "baixa";
  const tiny = (v: number) => v <= p.range * 0.1;

  if (p.bodyRatio <= 0.1) {
    if (p.lower >= p.range * 0.6 && tiny(p.upper)) {
      return {
        name: "Doji libélula",
        bias: "alta",
        meaning:
          "Os vendedores empurraram o preço para baixo, mas os compradores o trouxeram de volta até a abertura.",
        context:
          "Ganha importância no fim de uma queda e perto de um suporte. Precisa de confirmação no candle seguinte.",
      };
    }
    if (p.upper >= p.range * 0.6 && tiny(p.lower)) {
      return {
        name: "Doji lápide",
        bias: "baixa",
        meaning:
          "Os compradores levaram o preço para cima, mas os vendedores o devolveram até a abertura.",
        context:
          "Ganha importância no fim de uma alta e perto de uma resistência. Precisa de confirmação no candle seguinte.",
      };
    }
    return {
      name: "Doji",
      bias: "indecisao",
      meaning:
        "Abertura e fechamento quase iguais: compradores e vendedores terminaram empatados.",
      context:
        "Depois de um movimento longo, sinaliza perda de força; no meio de uma lateralização, quase não diz nada.",
    };
  }
  if (p.bodyRatio >= 0.9) {
    return {
      name: `Marubozu de ${side}`,
      bias: p.bullish ? "alta" : "baixa",
      meaning: p.bullish
        ? "Corpo cheio, quase sem pavios: os compradores controlaram o período do início ao fim."
        : "Corpo cheio, quase sem pavios: os vendedores controlaram o período do início ao fim.",
      context:
        "Mostra força na direção do corpo. Rompendo um suporte ou uma resistência, costuma indicar continuação.",
    };
  }
  if (
    p.lower >= p.body * 2 &&
    p.upper <= Math.max(p.body * 0.5, p.range * 0.1)
  ) {
    return {
      name: "Martelo (ou enforcado)",
      bias: "alta",
      meaning:
        "Pavio inferior longo: o preço caiu bastante durante o período, mas foi rejeitado e fechou perto da máxima.",
      context:
        "Depois de uma queda, perto de suporte, é o martelo (possível reversão para alta). O mesmo formato no topo de uma alta se chama enforcado e alerta para queda.",
    };
  }
  if (
    p.upper >= p.body * 2 &&
    p.lower <= Math.max(p.body * 0.5, p.range * 0.1)
  ) {
    return {
      name: "Estrela cadente (ou martelo invertido)",
      bias: "baixa",
      meaning:
        "Pavio superior longo: o preço subiu bastante durante o período, mas foi rejeitado e fechou perto da mínima.",
      context:
        "No topo de uma alta, perto de resistência, é a estrela cadente (possível reversão para baixa). O mesmo formato no fundo de uma queda se chama martelo invertido.",
    };
  }
  if (
    p.bodyRatio <= 0.35 &&
    p.upper >= p.range * 0.2 &&
    p.lower >= p.range * 0.2
  ) {
    return {
      name: "Pião",
      bias: "indecisao",
      meaning:
        "Corpo pequeno com pavios dos dois lados: o preço andou para cima e para baixo e terminou perto de onde abriu.",
      context:
        "Indica equilíbrio e perda de força da tendência. Sozinho não define direção.",
    };
  }
  const dominant =
    p.lower > p.upper * 1.5
      ? " O pavio inferior maior mostra compradores defendendo os preços baixos."
      : p.upper > p.lower * 1.5
        ? " O pavio superior maior mostra vendedores defendendo os preços altos."
        : "";
  return {
    name: `Candle de ${side}`,
    bias: p.bullish ? "alta" : "baixa",
    meaning: `${p.bullish ? "Fechou acima da abertura: os compradores venceram o período." : "Fechou abaixo da abertura: os vendedores venceram o período."}${dominant}`,
    context:
      "Um candle comum só ganha sentido junto dos anteriores, da tendência e dos níveis de suporte e resistência.",
  };
}

/** Ready-made shapes for the anatomy lab; each one reads as its own label. */
export const CANDLE_PRESETS: { label: string; k: Ohlc }[] = [
  { label: "Candle de alta", k: { o: 98, h: 103.2, l: 97.2, c: 102.4 } },
  { label: "Candle de baixa", k: { o: 102.4, h: 103.2, l: 97.2, c: 98 } },
  { label: "Martelo", k: { o: 101.2, h: 102.4, l: 94, c: 102.2 } },
  { label: "Estrela cadente", k: { o: 99.2, h: 106, l: 97.6, c: 97.8 } },
  { label: "Doji", k: { o: 100, h: 103, l: 97, c: 100.1 } },
  { label: "Doji libélula", k: { o: 102, h: 102.1, l: 96, c: 102 } },
  { label: "Doji lápide", k: { o: 98, h: 104, l: 97.9, c: 98 } },
  { label: "Pião", k: { o: 99.4, h: 102.6, l: 97, c: 100.4 } },
  { label: "Marubozu de alta", k: { o: 96, h: 104.1, l: 95.9, c: 104 } },
  { label: "Marubozu de baixa", k: { o: 104, h: 104.1, l: 95.9, c: 96 } },
];

/**
 * Win rate needed to break even in a fixed-payout option: a win pays
 * `payoutPct`% of the stake and a loss costs the whole stake.
 */
export function breakEvenWinRate(payoutPct: number): number {
  return 100 / (1 + payoutPct / 100);
}
