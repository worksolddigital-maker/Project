import { describe, expect, it } from "vitest";
import {
  mappingIssues,
  normalizeRow,
  parseDirection,
  parseImportDateTime,
  parseResult,
  suggestMapping,
  tradeSignature,
} from "@/lib/domain/import-mapping";
import { tradeInputSchema } from "@/lib/validation/schemas";

const TZ = "America/Sao_Paulo";
const opts = { timezone: TZ, fallbackPayoutPct: null, fallbackExpirationSeconds: null };

describe("import mapping", () => {
  it("suggests mapping from Portuguese headers", () => {
    const m = suggestMapping(["Data", "Hora", "Ativo", "Tipo", "Valor (R$)", "Expiração", "Resultado", "Payout %", "Lucro", "Estratégia", "Observações"]);
    expect(m).toMatchObject({ date: 0, time: 1, asset: 2, direction: 3, stake: 4, expiration: 5, result: 6, payout: 7, profit: 8, strategy: 9, notes: 10 });
    expect(mappingIssues(m)).toEqual([]);
  });

  it("suggests mapping from English headers with a datetime column", () => {
    const m = suggestMapping(["Open time", "Symbol", "Direction", "Amount", "Duration", "Result", "Profit"]);
    expect(m.datetime).toBe(0);
    expect(m.date).toBeNull();
    expect(m.asset).toBe(1);
    expect(m.stake).toBe(3);
    expect(m.profit).toBe(6);
  });

  it("reports missing required columns", () => {
    const m = suggestMapping(["foo", "bar"]);
    expect(mappingIssues(m).length).toBeGreaterThan(0);
  });

  it("parses words for direction and result", () => {
    expect(parseDirection("Compra")).toBe("CALL");
    expect(parseDirection("put")).toBe("PUT");
    expect(parseResult("Vitória")).toBe("WIN");
    expect(parseResult("LOSS")).toBe("LOSS");
    expect(parseResult("Empate")).toBe("DRAW");
    expect(parseResult("???")).toBeNull();
  });

  it("parses many date formats as wall-clock in the user's timezone", () => {
    expect(parseImportDateTime("25/11/2026", "14:30", TZ)).toBe("2026-11-25T17:30:00.000Z");
    expect(parseImportDateTime("25/11/2026 14:30:15", null, TZ)).toBe("2026-11-25T17:30:15.000Z");
    expect(parseImportDateTime("2026-11-25 14:30", null, TZ)).toBe("2026-11-25T17:30:00.000Z");
    expect(parseImportDateTime("2026-11-25T14:30:00Z", null, TZ)).toBe("2026-11-25T14:30:00.000Z");
    expect(parseImportDateTime("25/11/26", "02:05 PM", TZ)).toBe("2026-11-25T17:05:00.000Z");
    // Excel serial 46351.5 = 2026-11-25 12:00
    expect(parseImportDateTime("46351.5", null, TZ)).toBe("2026-11-25T15:00:00.000Z");
    expect(parseImportDateTime("31/02/2026", null, TZ)).toBeNull();
  });
});

describe("row normalization", () => {
  const mapping = suggestMapping(["data", "hora", "ativo", "tipo", "valor", "expiracao", "resultado", "payout", "lucro", "estrategia", "observacoes"]);

  it("computes profit from payout when profit is empty", () => {
    const r = normalizeRow(["20/11/2026", "10:00", "eur/usd", "CALL", "50,00", "1m", "WIN", "87%", "", "Pullback", "ok"], mapping, opts);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.trade).toMatchObject({
        asset: "EUR/USD",
        direction: "CALL",
        stakeCents: 5000,
        expirationSeconds: 60,
        result: "WIN",
        payoutPct: 87,
        profitCents: 4350,
        profitIsManual: false,
        strategyName: "Pullback",
      });
    }
  });

  it("uses informed profit and derives payout", () => {
    const r = normalizeRow(["20/11/2026", "10:00", "GBP/USD", "PUT", "100", "5", "", "", "91,50", "", ""], mapping, opts);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.trade.result).toBe("WIN");
      expect(r.trade.profitCents).toBe(9150);
      expect(r.trade.payoutPct).toBe(91.5);
      expect(r.trade.expirationSeconds).toBe(300);
    }
  });

  it("accepts losses exported as positive amounts", () => {
    const r = normalizeRow(["20/11/2026", "10:00", "GBP/USD", "PUT", "100", "1m", "LOSS", "", "100", "", ""], mapping, opts);
    expect(r.ok && r.trade.profitCents).toBe(-10000);
  });

  it("rejects invalid rows with explicit messages", () => {
    const r = normalizeRow(["xx", "", "", "UP?", "abc", "zz", "WIN", "", "", "", ""], mapping, opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });

  it("rejects WIN without payout or profit unless fallback is enabled", () => {
    const row = ["20/11/2026", "10:00", "EUR/USD", "CALL", "10", "1m", "WIN", "", "", "", ""];
    expect(normalizeRow(row, mapping, opts).ok).toBe(false);
    const r = normalizeRow(row, mapping, { ...opts, fallbackPayoutPct: 80 });
    expect(r.ok && r.trade.profitCents).toBe(800);
  });

  it("builds stable duplicate signatures", () => {
    const a = { executedAt: "2026-11-20T13:00:00Z", asset: "EUR/USD", stakeCents: 100, result: "WIN", profitCents: 80, direction: "CALL" };
    expect(tradeSignature(a)).toBe(tradeSignature({ ...a, executedAt: "2026-11-20T13:00:00.000Z" }));
  });
});

describe("trade input schema", () => {
  const base = {
    executedAt: "2026-11-20T13:00:00.000Z",
    asset: "EUR/USD",
    direction: "CALL",
    stakeCents: 1000,
    expirationSeconds: 60,
    result: "WIN",
    payoutPct: 85,
    profitIsManual: false,
    strategyId: null,
    notes: "",
  };

  it("accepts a valid trade", () => {
    expect(tradeInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects future dates, zero stake and WIN without payout", () => {
    expect(tradeInputSchema.safeParse({ ...base, executedAt: "2999-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(tradeInputSchema.safeParse({ ...base, stakeCents: 0 }).success).toBe(false);
    const r = tradeInputSchema.safeParse({ ...base, payoutPct: null });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["payoutPct"]);
  });

  it("validates manual profit sign", () => {
    const r = tradeInputSchema.safeParse({ ...base, result: "LOSS", profitIsManual: true, profitCents: 500 });
    expect(r.success).toBe(false);
  });
});
