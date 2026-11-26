import { describe, expect, it } from "vitest";
import { breakEvenWinRate, CANDLE_PRESETS, normalizeCandle, parts, readCandle } from "@/lib/academy/candles";
import { CANDLE_PATTERNS, CHART_PATTERNS, findCandlePattern, findChartPattern, kindBias, SETUP_PAIRS } from "@/lib/academy/patterns";
import { londonNewYorkOverlap, sessionWindows } from "@/lib/academy/sessions";

describe("candle reading", () => {
  it("measures body and wicks", () => {
    expect(parts({ o: 10, h: 14, l: 7, c: 12 })).toEqual({ range: 7, body: 2, upper: 2, lower: 3, bodyRatio: 2 / 7, bullish: true });
    expect(normalizeCandle({ o: 10, h: 9, l: 11, c: 12 })).toEqual({ o: 10, c: 12, h: 12, l: 10 });
  });

  it("names the classic shapes", () => {
    expect(readCandle({ o: 100.6, h: 101.4, l: 96, c: 101.2 }).name).toBe("Martelo (ou enforcado)");
    expect(readCandle({ o: 99.6, h: 103.8, l: 98.6, c: 98.6 }).name).toBe("Estrela cadente (ou martelo invertido)");
    expect(readCandle({ o: 99, h: 101.4, l: 96.8, c: 99.05 }).name).toBe("Doji");
    expect(readCandle({ o: 100, h: 100.05, l: 95, c: 100 }).name).toBe("Doji libélula");
    expect(readCandle({ o: 100, h: 105, l: 99.95, c: 100 }).name).toBe("Doji lápide");
    expect(readCandle({ o: 97, h: 102.2, l: 96.95, c: 102.15 })).toMatchObject({ name: "Marubozu de alta", bias: "alta" });
    expect(readCandle({ o: 100, h: 102, l: 98, c: 100.5 }).name).toBe("Pião");
    expect(readCandle({ o: 100, h: 100, l: 100, c: 100 }).name).toBe("Sem variação");
    expect(readCandle({ o: 100, h: 104.2, l: 99, c: 103 })).toMatchObject({ name: "Candle de alta", bias: "alta" });
  });

  it("every single-candle pattern's illustration matches its own reading", () => {
    const expected: Record<string, string> = {
      martelo: "Martelo (ou enforcado)",
      enforcado: "Martelo (ou enforcado)",
      "martelo-invertido": "Estrela cadente (ou martelo invertido)",
      "estrela-cadente": "Estrela cadente (ou martelo invertido)",
      doji: "Doji",
      "marubozu-alta": "Marubozu de alta",
      "marubozu-baixa": "Marubozu de baixa",
    };
    for (const [id, name] of Object.entries(expected)) {
      const p = findCandlePattern(id)!;
      expect(readCandle(p.candles[p.candles.length - 1]).name, id).toBe(name);
    }
  });

  it("break-even win rate for fixed payouts", () => {
    expect(breakEvenWinRate(100)).toBe(50);
    expect(breakEvenWinRate(87)).toBeCloseTo(53.48, 2);
    expect(breakEvenWinRate(80)).toBeCloseTo(55.56, 2);
  });
});

describe("pattern catalog", () => {
  it("has consistent candles and complete texts", () => {
    for (const p of CANDLE_PATTERNS) {
      expect(p.candles.length, p.id).toBeGreaterThan(p.candlesCount);
      for (const c of p.candles) expect(c.h >= Math.max(c.o, c.c) && c.l <= Math.min(c.o, c.c), p.id).toBe(true);
      expect(p.recognize.length && p.meaning && p.where && p.confirm && p.invalid, p.id).toBeTruthy();
    }
    expect(new Set(CANDLE_PATTERNS.map((p) => p.id)).size).toBe(CANDLE_PATTERNS.length);
  });

  it("two-candle patterns respect their definitions", () => {
    const last2 = (id: string) => findCandlePattern(id)!.candles.slice(-2);
    const [r, g] = last2("engolfo-alta");
    expect(r.c < r.o && g.c > g.o && g.o <= r.c && g.c >= r.o).toBe(true);
    const [g2, r2] = last2("engolfo-baixa");
    expect(g2.c > g2.o && r2.c < r2.o && r2.o >= g2.c && r2.c <= g2.o).toBe(true);
    const [big, small] = last2("harami-alta");
    expect(Math.max(small.o, small.c) < big.o && Math.min(small.o, small.c) > big.c).toBe(true);
    const [red, green] = last2("perfuracao");
    expect(green.c > (red.o + red.c) / 2 && green.c < red.o).toBe(true);
    const [a, b] = last2("pinca-fundo");
    expect(a.l).toBe(b.l);
  });

  it("buy/sell pairs point to existing patterns with matching direction", () => {
    for (const { buy, sell } of SETUP_PAIRS) {
      const bc = findCandlePattern(buy.candle)!;
      const sc = findCandlePattern(sell.candle)!;
      expect(kindBias(bc.kind), buy.title).toBe("alta");
      expect(kindBias(sc.kind), sell.title).toBe("baixa");
      for (const chart of [buy.chart, sell.chart]) expect(["suporte", "resistencia"].includes(chart) || !!findChartPattern(chart), chart).toBe(true);
    }
    expect(CHART_PATTERNS.every((c) => c.path.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100))).toBe(true);
  });
});

describe("market sessions", () => {
  const brt = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

  it("follows daylight saving in London and New York", () => {
    // November: London on GMT, New York on EST.
    const nov = sessionWindows(new Date("2026-11-26T09:00:00Z"));
    const lon = nov.find((w) => w.session.id === "londres")!;
    const ny = nov.find((w) => w.session.id === "nova-york")!;
    expect(brt(lon.start)).toBe("05:00");
    expect(brt(ny.start)).toBe("10:00");
    expect(lon.open).toBe(true);
    expect(ny.open).toBe(false);
    // July: London on BST, New York on EDT (one hour earlier for Brasília).
    const jul = sessionWindows(new Date("2026-07-15T14:00:00Z"));
    expect(brt(jul.find((w) => w.session.id === "londres")!.start)).toBe("04:00");
    expect(brt(jul.find((w) => w.session.id === "nova-york")!.start)).toBe("09:00");
    expect(londonNewYorkOverlap(jul)).toBe(true);
  });

  it("is closed on weekends and points to Monday", () => {
    const sat = sessionWindows(new Date("2026-11-28T15:00:00Z"));
    expect(sat.every((w) => !w.open)).toBe(true);
    expect(sat.find((w) => w.session.id === "londres")!.start).toBe("2026-11-30T08:00:00.000Z");
  });
});

describe("anatomy presets", () => {
  it("each preset reads as the shape it is named after", () => {
    const expected: Record<string, string> = {
      Martelo: "Martelo (ou enforcado)",
      "Estrela cadente": "Estrela cadente (ou martelo invertido)",
    };
    for (const { label, k } of CANDLE_PRESETS) {
      expect(readCandle(k).name, label).toBe(expected[label] ?? label);
    }
  });
});
