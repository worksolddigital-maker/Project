import { describe, expect, it } from "vitest";
import { ASSET_CATALOG, EMPTY_ASSET_PREFS, findAsset, suggestedPayout } from "@/lib/domain/assets";
import { passwordContainsName } from "@/lib/security";
import { passwordSchema } from "@/lib/validation/schemas";
import {
  buildLedger,
  buildPortfolio,
  comparePeriods,
  computeStreaks,
  groupByAsset,
  groupByHour,
  groupByMonth,
  groupByWeek,
  sortTrades,
  summarize,
  winRateTimeline,
} from "@/lib/domain/analytics";
import {
  addDays,
  addMonths,
  dayKeyOf,
  isDayKey,
  monthGrid,
  previousRange,
  resolvePreset,
  weekStartOf,
  zonedWallTimeToIso,
} from "@/lib/domain/dates";
import { computeGoals, dailyGoalHistory, goalStats } from "@/lib/domain/goals";
import { centsToInput, formatMoney, formatPct, parseMoneyToCents, parsePercent } from "@/lib/domain/money";
import { checkDraftTrade, computeRiskMetrics, evaluateAlerts, stakeIncreasesAfterLoss } from "@/lib/domain/risk";
import {
  computeProfitCents,
  formatExpiration,
  parseExpiration,
  resolveFinancials,
  returnPct,
  validateManualProfit,
} from "@/lib/domain/trade-calc";
import { cash, settings, trade } from "./fixtures";

const TZ = "America/Sao_Paulo"; // UTC-3, no DST since 2019

describe("money", () => {
  it.each([
    ["10", 1000],
    ["10,5", 1050],
    ["10,50", 1050],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["1234.56", 123456],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["R$ 25,00", 2500],
    ["-15,30", -1530],
    ["(15,30)", -1530],
    ["0,005", 1],
    ["0,004", 0],
    ["  7  ", 700],
  ])("parses %s", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3a", "--", "R$"])("rejects %s", (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });

  it("parses numbers from spreadsheets", () => {
    expect(parseMoneyToCents(12.34)).toBe(1234);
    expect(parseMoneyToCents(0.1 + 0.2)).toBe(30);
  });

  it("formats currency with signs", () => {
    expect(formatMoney(123456, "BRL")).toMatch(/R\$\s?1\.234,56/);
    expect(formatMoney(-500, "BRL")).toMatch(/^−R\$\s?5,00$/);
    expect(formatMoney(500, "BRL", { signed: true })).toMatch(/^\+R\$\s?5,00$/);
    expect(formatMoney(0, "BRL", { signed: true })).toMatch(/^R\$\s?0,00$/);
  });

  it("round-trips input formatting", () => {
    expect(centsToInput(123456)).toBe("1234,56");
    expect(centsToInput(5)).toBe("0,05");
    expect(parseMoneyToCents(centsToInput(98765))).toBe(98765);
  });

  it("formats and parses percentages", () => {
    expect(formatPct(12.345)).toBe("12,3%");
    expect(formatPct(-3.21, { signed: true })).toBe("−3,2%");
    expect(formatPct(null)).toBe("—");
    expect(parsePercent("87,5%")).toBe(87.5);
    expect(parsePercent("x")).toBeNull();
  });
});

describe("dates", () => {
  it("computes day keys in the user's timezone", () => {
    // 02:00 UTC is 23:00 of the previous day in São Paulo.
    expect(dayKeyOf("2026-03-10T02:00:00.000Z", TZ)).toBe("2026-03-09");
    expect(dayKeyOf("2026-03-10T03:00:00.000Z", TZ)).toBe("2026-03-10");
  });

  it("converts wall clock to UTC, including DST zones", () => {
    expect(zonedWallTimeToIso("2026-03-09", "23:00", TZ)).toBe("2026-03-10T02:00:00.000Z");
    // New York: EST (UTC-5) in January, EDT (UTC-4) in July.
    expect(zonedWallTimeToIso("2026-01-15", "09:30:00", "America/New_York")).toBe("2026-01-15T14:30:00.000Z");
    expect(zonedWallTimeToIso("2026-07-15", "09:30:00", "America/New_York")).toBe("2026-07-15T13:30:00.000Z");
  });

  it("does calendar arithmetic", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(weekStartOf("2026-11-29")).toBe("2026-11-23"); // Sunday -> Monday
    expect(weekStartOf("2026-11-23")).toBe("2026-11-23");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(isDayKey("2026-02-30")).toBe(false);
  });

  it("builds a Monday-first month grid", () => {
    const grid = monthGrid("2026-11");
    expect(grid[0][0]).toBe("2026-10-26");
    expect(grid.flat()).toContain("2026-11-30");
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });

  it("resolves period presets", () => {
    expect(resolvePreset("thisWeek", "2026-11-26")).toEqual({ from: "2026-11-23", to: "2026-11-26" });
    expect(resolvePreset("lastMonth", "2026-03-15")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(resolvePreset("last7", "2026-11-26")).toEqual({ from: "2026-11-20", to: "2026-11-26" });
    expect(previousRange({ from: "2026-11-01", to: "2026-11-30" })).toEqual({ from: "2026-10-02", to: "2026-10-31" });
  });
});

describe("trade calculations", () => {
  it("computes profit by result", () => {
    expect(computeProfitCents("WIN", 10000, 87)).toBe(8700);
    expect(computeProfitCents("WIN", 333, 85)).toBe(283); // 283.05 -> 283
    expect(computeProfitCents("WIN", 1000, null)).toBeNull();
    expect(computeProfitCents("LOSS", 2500, 90)).toBe(-2500);
    expect(computeProfitCents("DRAW", 2500, 90)).toBe(0);
    expect(returnPct(8700, 10000)).toBeCloseTo(87);
    expect(returnPct(-1000, 1000)).toBe(-100);
  });

  it("validates manual profit consistency", () => {
    expect(validateManualProfit("WIN", 1000, 0)).not.toBeNull();
    expect(validateManualProfit("LOSS", 1000, -1500)).not.toBeNull();
    expect(validateManualProfit("LOSS", 1000, -500)).toBeNull();
    expect(validateManualProfit("DRAW", 1000, 10)).not.toBeNull();
  });

  it("resolves financials", () => {
    expect(resolveFinancials({ result: "WIN", stakeCents: 1000, payoutPct: 80, profitIsManual: false })).toEqual({
      ok: true,
      profitCents: 800,
      profitIsManual: false,
    });
    expect(resolveFinancials({ result: "WIN", stakeCents: 1000, payoutPct: null, profitIsManual: false }).ok).toBe(false);
    expect(
      resolveFinancials({ result: "WIN", stakeCents: 1000, payoutPct: null, profitIsManual: true, profitCents: 910 }),
    ).toEqual({ ok: true, profitCents: 910, profitIsManual: true });
  });

  it("parses and formats expirations", () => {
    expect(parseExpiration("30s")).toBe(30);
    expect(parseExpiration("1m")).toBe(60);
    expect(parseExpiration("M5")).toBe(300);
    expect(parseExpiration("5")).toBe(300);
    expect(parseExpiration("00:01:30")).toBe(90);
    expect(parseExpiration("1 min")).toBe(60);
    expect(parseExpiration("1h")).toBe(3600);
    expect(parseExpiration("abc")).toBeNull();
    expect(formatExpiration(90)).toBe("1 min 30s");
    expect(formatExpiration(3600)).toBe("1 h");
    expect(formatExpiration(86400)).toBe("1 dia");
  });
});

describe("summary", () => {
  const trades = [
    trade({ executedAt: "2026-11-02T13:00:00.000Z", result: "WIN", stakeCents: 1000, payoutPct: 80 }), // +800
    trade({ executedAt: "2026-11-02T13:05:00.000Z", result: "LOSS", stakeCents: 1000 }), // -1000
    trade({ executedAt: "2026-11-02T13:10:00.000Z", result: "WIN", stakeCents: 2000, payoutPct: 90 }), // +1800
    trade({ executedAt: "2026-11-03T13:00:00.000Z", result: "DRAW", stakeCents: 500 }), // 0
    trade({ executedAt: "2026-11-03T14:00:00.000Z", result: "LOSS", stakeCents: 500 }), // -500
  ];

  it("computes all KPIs exactly", () => {
    const s = summarize(trades);
    expect(s.count).toBe(5);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(2);
    expect(s.draws).toBe(1);
    expect(s.winRate).toBe(50); // draws excluded
    expect(s.grossProfitCents).toBe(2600);
    expect(s.grossLossCents).toBe(1500);
    expect(s.netCents).toBe(1100);
    expect(s.avgWinCents).toBe(1300);
    expect(s.avgLossCents).toBe(750);
    expect(s.expectancyCents).toBe(220);
    expect(s.best?.profitCents).toBe(1800);
    expect(s.worst?.profitCents).toBe(-1000);
    expect(s.profitFactor).toBeCloseTo(2600 / 1500);
    expect(s.payoffRatio).toBeCloseTo(1300 / 750);
    expect(s.totalStakeCents).toBe(5000);
    expect(s.returnOnStakePct).toBeCloseTo(22);
  });

  it("handles empty data", () => {
    const s = summarize([]);
    expect(s.count).toBe(0);
    expect(s.winRate).toBeNull();
    expect(s.best).toBeNull();
    expect(s.profitFactor).toBeNull();
    expect(s.avgWinCents).toBeNull();
  });

  it("groups by asset, week, month and hour", () => {
    const mixed = [...trades, trade({ executedAt: "2026-11-10T15:00:00.000Z", result: "WIN", asset: "BTC/USD", stakeCents: 1000, payoutPct: 85 })];
    const assets = groupByAsset(mixed);
    expect(assets[0].key).toBe("EUR/USD");
    expect(assets[0].netCents).toBe(1100);
    expect(assets[1]).toMatchObject({ key: "BTC/USD", netCents: 850, wins: 1 });
    const weeks = groupByWeek(mixed, TZ);
    expect(weeks.get("2026-11-02")?.netCents).toBe(1100);
    expect(weeks.get("2026-11-09")?.netCents).toBe(850);
    expect(groupByMonth(mixed, TZ).get("2026-11")?.count).toBe(6);
    const hours = groupByHour(mixed, TZ);
    expect(hours).toHaveLength(24);
    expect(hours[10].count).toBe(4); // 13:xx UTC = 10:xx São Paulo
  });

  it("builds win-rate timeline", () => {
    const tl = winRateTimeline(sortTrades(trades), TZ);
    expect(tl).toHaveLength(2);
    expect(tl[0].dailyWinRate).toBeCloseTo(66.666, 2);
    expect(tl[1].dailyWinRate).toBe(0);
    expect(tl[1].cumulativeWinRate).toBe(50);
  });

  it("compares periods", () => {
    const rows = comparePeriods(summarize(trades.slice(0, 3)), summarize(trades.slice(3)));
    const net = rows.find((r) => r.key === "net")!;
    expect(net.a).toBe(1600);
    expect(net.b).toBe(-500);
    expect(net.delta).toBe(-2100);
  });
});

describe("streaks", () => {
  it("treats draws as neutral", () => {
    const t = (r: "WIN" | "LOSS" | "DRAW", i: number) => trade({ executedAt: `2026-11-02T13:0${i}:00.000Z`, result: r });
    const s = computeStreaks([t("LOSS", 0), t("LOSS", 1), t("DRAW", 2), t("LOSS", 3), t("WIN", 4), t("WIN", 5)]);
    expect(s.maxLoss).toBe(3);
    expect(s.maxWin).toBe(2);
    expect(s.currentWin).toBe(2);
    expect(s.currentLoss).toBe(0);
  });
});

describe("ledger and drawdown", () => {
  it("replays cash flows and trades", () => {
    const trades = [
      trade({ executedAt: "2026-11-02T13:00:00.000Z", result: "WIN", stakeCents: 10000, payoutPct: 100 }), // +100
      trade({ executedAt: "2026-11-02T14:00:00.000Z", result: "LOSS", stakeCents: 15000 }), // -150
      trade({ executedAt: "2026-11-03T13:00:00.000Z", result: "LOSS", stakeCents: 5000 }), // -50
      trade({ executedAt: "2026-11-04T13:00:00.000Z", result: "WIN", stakeCents: 10000, payoutPct: 80 }), // +80
    ];
    const flows = [
      cash({ occurredAt: "2026-11-01T12:00:00.000Z", type: "DEPOSIT", amountCents: 50000 }),
      cash({ occurredAt: "2026-11-03T12:00:00.000Z", type: "WITHDRAWAL", amountCents: 20000 }),
    ];
    const l = buildLedger(sortTrades(trades), flows, 100000, TZ);
    // 1000 + 500 deposit + 100 - 150 - 200 withdrawal - 50 + 80 = 1280
    expect(l.balanceCents).toBe(128000);
    expect(l.depositsCents).toBe(50000);
    expect(l.withdrawalsCents).toBe(20000);
    expect(l.netPnlCents).toBe(-2000);
    // P&L path: +100, -50, -100, -20 -> peak +100, trough -100 => max DD 200
    expect(l.drawdown.maxCents).toBe(20000);
    // At the trough the balance is 1200 (after the withdrawal) -> dd% = 200 / (1200 + 200)
    expect(l.drawdown.maxPct).toBeCloseTo((200 / 1400) * 100, 5);
    expect(l.drawdown.currentCents).toBe(12000);
    expect(l.dayStartBalance.get("2026-11-02")).toBe(150000);
    expect(l.dayStartBalance.get("2026-11-03")).toBe(145000);
    expect(l.balanceBeforeTrade.get(trades[1].id)).toBe(160000);
  });

  it("withdrawals do not create drawdown", () => {
    const flows = [cash({ occurredAt: "2026-11-01T12:00:00.000Z", type: "WITHDRAWAL", amountCents: 50000 })];
    const l = buildLedger([], flows, 100000, TZ);
    expect(l.balanceCents).toBe(50000);
    expect(l.drawdown.maxCents).toBe(0);
  });
});

describe("portfolio, risk and goals", () => {
  const now = new Date("2026-11-26T18:00:00.000Z"); // 15:00 in São Paulo
  const s = settings({
    initialCapitalCents: 100000,
    dailyLossLimitCents: 5000,
    maxStakeCents: 2000,
    riskPerTradePct: 2,
    maxTradesPerDay: 4,
    maxConsecutiveLosses: 3,
    dailyProfitGoalCents: 3000,
    weeklyProfitGoalCents: 10000,
    monthlyProfitGoalCents: 40000,
  });
  const trades = [
    trade({ executedAt: "2026-11-20T13:00:00.000Z", result: "WIN", stakeCents: 2000, payoutPct: 90 }), // last week +1800
    trade({ executedAt: "2026-11-24T13:00:00.000Z", result: "WIN", stakeCents: 2000, payoutPct: 90 }), // this week +1800
    trade({ executedAt: "2026-11-26T13:00:00.000Z", result: "LOSS", stakeCents: 1000 }),
    trade({ executedAt: "2026-11-26T13:05:00.000Z", result: "LOSS", stakeCents: 2500 }), // raised after loss, above max
    trade({ executedAt: "2026-11-26T13:10:00.000Z", result: "LOSS", stakeCents: 1500 }),
  ];
  const p = buildPortfolio({ trades, cash: [], settings: s, now });

  it("computes balances and periods", () => {
    expect(p.today).toBe("2026-11-26");
    expect(p.balanceCents).toBe(100000 + 1800 + 1800 - 5000);
    expect(p.netCents).toBe(-1400);
    expect(p.returnPct).toBeCloseTo(-1.4);
    expect(p.todayStats.netCents).toBe(-5000);
    expect(p.todayStats.count).toBe(3);
    expect(p.todayStartBalanceCents).toBe(103600);
    expect(p.todayStats.returnPct).toBeCloseTo((-5000 / 103600) * 100);
    expect(p.weekNetCents).toBe(1800 - 5000);
    expect(p.monthNetCents).toBe(-1400);
    expect(p.todayStreaks.currentLoss).toBe(3);
  });

  it("computes risk metrics", () => {
    const m = computeRiskMetrics(p, s);
    expect(m.dailyExposureCents).toBe(5000);
    expect(m.capitalCommittedPct).toBeCloseTo((5000 / 103600) * 100);
    expect(m.dailyLossUsedPct).toBe(100);
    expect(m.tradesAboveMaxStake).toHaveLength(1);
    expect(m.stakeIncreasesAfterLoss).toHaveLength(1);
    expect(m.tradesAboveRiskPct.map((t) => t.stakeCents)).toEqual([2500]);
  });

  it("raises the expected alerts", () => {
    const ids = evaluateAlerts(p, s).map((a) => a.id.split(":")[0]);
    expect(ids).toContain("daily-loss-hit");
    expect(ids).toContain("loss-streak-hit");
    expect(ids).toContain("stake-above-max");
    expect(ids).toContain("stake-raise-after-loss");
    expect(ids).not.toContain("daily-goal");
    expect(ids).not.toContain("max-trades-hit");
  });

  it("warns about draft trades", () => {
    const w = checkDraftTrade(p, s, { stakeCents: 5000, dayKey: "2026-11-26" });
    expect(w.some((x) => x.includes("máximo por operação"))).toBe(true);
    expect(w.some((x) => x.includes("limite diário de perda"))).toBe(true);
  });

  it("computes goal progress", () => {
    const goals = computeGoals(p, s);
    const daily = goals.find((g) => g.key === "daily")!;
    expect(daily.status).toBe("pending");
    expect(daily.progressPct).toBe(0);
    const trades = goals.find((g) => g.key === "maxTrades")!;
    expect(trades.current).toBe(3);
    expect(trades.status).toBe("near");
    const losses = goals.find((g) => g.key === "maxLosses")!;
    expect(losses.status).toBe("breached");
    const hist = dailyGoalHistory(p, s, 7);
    expect(hist).toHaveLength(7);
    expect(hist[6].key).toBe("2026-11-26");
    expect(hist[4].netCents).toBe(1800); // 2026-11-24
    const gs = goalStats(p, s);
    expect(gs.tradingDays).toBe(3);
    expect(gs.daysLossLimitHit).toBe(1);
  });

  it("detects stake increases after losses", () => {
    const sorted = sortTrades(trades);
    expect(stakeIncreasesAfterLoss(sorted).map((t) => t.stakeCents)).toEqual([2500]);
  });
});

describe("behaviour stats", () => {
  it("counts trades after the daily loss limit and streak continuation", async () => {
    const { behaviorStats } = await import("@/lib/domain/risk");
    const { dayKeyOf } = await import("@/lib/domain/dates");
    const s = settings({ dailyLossLimitCents: 2000, maxConsecutiveLosses: 2, maxTradesPerDay: 3 });
    const list = sortTrades([
      trade({ executedAt: "2026-11-02T13:00:00.000Z", result: "LOSS", stakeCents: 1000 }),
      trade({ executedAt: "2026-11-02T13:01:00.000Z", result: "LOSS", stakeCents: 1000 }), // limit hit (-2000), streak 2
      trade({ executedAt: "2026-11-02T13:02:00.000Z", result: "WIN", stakeCents: 2000, payoutPct: 80 }), // after limit
      trade({ executedAt: "2026-11-02T13:03:00.000Z", result: "LOSS", stakeCents: 500 }), // after limit, over max trades
    ]);
    const b = behaviorStats(list, "America/Sao_Paulo", s, (t) => dayKeyOf(t.executedAt, "America/Sao_Paulo"));
    expect(b.tradesAfterLossLimit).toBe(2);
    expect(b.daysLossLimitBreached).toBe(1);
    expect(b.daysOverMaxTrades).toBe(1);
    expect(b.daysContinuedAfterLossStreak).toBe(1);
    expect(b.stakeRaisesAfterLoss).toBe(1);
    expect(b.tradingDays).toBe(1);
  });
});

describe("asset catalog", () => {
  it("has unique symbols and payouts captured from the broker screens", () => {
    const symbols = ASSET_CATALOG.map((a) => a.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
    expect(findAsset("cobre")?.payoutPct).toBe(98);
    expect(findAsset("EUR/CAD")?.payoutPct).toBe(90);
    expect(findAsset("BNB")?.category).toBe("cripto");
    // Payouts that were not visible stay unknown instead of being guessed.
    expect(findAsset("EUR/NZD")?.payoutPct).toBeNull();
  });

  it("prefers the account's own payout over the reference value", () => {
    expect(suggestedPayout("EUR/USD", EMPTY_ASSET_PREFS)).toBe(88);
    expect(suggestedPayout("eur/usd", { payouts: { "EUR/USD": 91 }, favorites: [] })).toBe(91);
    expect(suggestedPayout("EUR/NZD", EMPTY_ASSET_PREFS)).toBeNull();
    expect(suggestedPayout("XYZ/ABC", undefined)).toBeNull();
  });
});

describe("password policy", () => {
  it("requires length, mixed case and digits", () => {
    expect(passwordSchema.safeParse("curta1A").success).toBe(false);
    expect(passwordSchema.safeParse("somenteminusculas1").success).toBe(false);
    expect(passwordSchema.safeParse("SEMNUMEROSaqui").success).toBe(false);
    expect(passwordSchema.safeParse("Painel2026ok").success).toBe(true);
  });

  it("detects the person's name inside the password, ignoring accents and case", () => {
    expect(passwordContainsName("JoaoSilva2026", "João da Silva")).toBe(true);
    expect(passwordContainsName("Painel2026ok", "João da Silva")).toBe(false);
    // Short name parts (e.g. "da") are ignored.
    expect(passwordContainsName("Dados2026Ok", "Ana da Luz")).toBe(false);
  });
});
