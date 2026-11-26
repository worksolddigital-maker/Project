/**
 * Example account for the demo. Every value here is fictitious and the account,
 * strategies and banner say so; it only exists so the screens can be explored
 * with data before entering real operations.
 */
import { addDays, todayKey, zonedWallTimeToIso } from "@/lib/domain/dates";
import { computeProfitCents } from "@/lib/domain/trade-calc";
import { DEFAULT_SETTINGS, type Direction, type Trade, type TradeResult } from "@/lib/domain/types";
import { uuid } from "./api";
import { getState, mutate } from "./store";

export const EXAMPLE_EMAIL = "exemplo@demo.local";

export function openExampleAccount() {
  const existing = getState().accounts.find((a) => a.example);
  if (existing) {
    mutate((s) => {
      s.session = existing.id;
    });
    return;
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  const id = uuid();
  const now = new Date();
  const created = now.toISOString();
  const today = todayKey(tz, now);
  let seed = 20261126;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

  const pullback = { id: uuid(), accountId: id, name: "Pullback (exemplo)", description: "Estratégia fictícia da conta de exemplo", createdAt: created };
  const breakout = { id: uuid(), accountId: id, name: "Rompimento (exemplo)", description: "Estratégia fictícia da conta de exemplo", createdAt: created };
  const assets = ["EUR/USD", "GBP/USD", "USD/JPY", "EUR/USD (OTC)", "BTC/USD"];

  const trades: (Trade & { accountId: string })[] = [];
  for (let d = 40; d >= 0; d--) {
    if (d > 0 && rnd() < 0.3) continue;
    const day = addDays(today, -d);
    const n = 2 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      const hh = 9 + Math.floor(rnd() * 8);
      const mm = Math.floor(rnd() * 60);
      const executedAt = zonedWallTimeToIso(day, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`, tz);
      if (new Date(executedAt) > now) continue;
      const r = rnd();
      const result: TradeResult = r < 0.56 ? "WIN" : r < 0.95 ? "LOSS" : "DRAW";
      const stakeCents = pick([2000, 3000, 5000, 7000]);
      const payoutPct = 80 + Math.floor(rnd() * 12);
      trades.push({
        id: uuid(),
        accountId: id,
        executedAt,
        asset: pick(assets),
        direction: (rnd() < 0.5 ? "CALL" : "PUT") as Direction,
        stakeCents,
        expirationSeconds: pick([60, 120, 300]),
        result,
        payoutPct,
        profitCents: computeProfitCents(result, stakeCents, payoutPct) ?? 0,
        profitIsManual: false,
        strategyId: rnd() < 0.45 ? pullback.id : rnd() < 0.5 ? breakout.id : null,
        notes: "",
        createdAt: created,
        updatedAt: created,
      });
    }
  }

  const at = (daysAgo: number, time: string) => zonedWallTimeToIso(addDays(today, -daysAgo), time, tz);

  mutate((s) => {
    s.accounts.push({ id, name: "Conta de exemplo", email: EXAMPLE_EMAIL, salt: "", passwordHash: "", createdAt: created, example: true });
    s.settings[id] = {
      ...DEFAULT_SETTINGS,
      timezone: tz,
      initialCapitalCents: 200000,
      maxStakeCents: 6000,
      riskPerTradePct: 3,
      dailyLossLimitCents: 15000,
      dailyProfitGoalCents: 8000,
      weeklyProfitGoalCents: 30000,
      monthlyProfitGoalCents: 100000,
      maxTradesPerDay: 8,
      maxConsecutiveLosses: 3,
    };
    s.strategies.push(pullback, breakout);
    s.cash.push(
      { id: uuid(), accountId: id, type: "DEPOSIT", amountCents: 50000, occurredAt: at(20, "10:00:00"), note: "Aporte (exemplo)", createdAt: created },
      { id: uuid(), accountId: id, type: "WITHDRAWAL", amountCents: 30000, occurredAt: at(5, "18:00:00"), note: "Saque (exemplo)", createdAt: created },
    );
    s.trades.push(...trades);
    s.journal.push(
      {
        id: uuid(),
        accountId: id,
        sessionDate: addDays(today, -2),
        tradeId: null,
        emotion: "ANXIOUS",
        emotionNote: "Anotação de exemplo",
        strategyId: pullback.id,
        followedPlan: "PARTIAL",
        impulsive: true,
        mainMistake: "Aumentei o valor logo depois de um LOSS.",
        didRight: "Parei ao atingir o limite diário.",
        toImprove: "Fazer uma pausa após duas perdas seguidas.",
        createdAt: created,
        updatedAt: created,
      },
      {
        id: uuid(),
        accountId: id,
        sessionDate: addDays(today, -1),
        tradeId: null,
        emotion: "CALM",
        emotionNote: "",
        strategyId: breakout.id,
        followedPlan: "YES",
        impulsive: false,
        mainMistake: "",
        didRight: "Segui o plano do início ao fim.",
        toImprove: "",
        createdAt: created,
        updatedAt: created,
      },
    );
    s.session = id;
  });
}
