import type { CashMovement, Trade, TradeResult, UserSettings } from "@/lib/domain/types";
import { DEFAULT_SETTINGS } from "@/lib/domain/types";

let seq = 0;

export function trade(partial: Partial<Trade> & { executedAt: string; result: TradeResult; stakeCents?: number }): Trade {
  seq++;
  const stake = partial.stakeCents ?? 1000;
  const payout = partial.payoutPct === undefined ? 80 : partial.payoutPct;
  const profit =
    partial.profitCents ??
    (partial.result === "WIN" ? Math.round((stake * (payout ?? 0)) / 100) : partial.result === "LOSS" ? -stake : 0);
  return {
    id: partial.id ?? `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    executedAt: partial.executedAt,
    asset: partial.asset ?? "EUR/USD",
    direction: partial.direction ?? "CALL",
    stakeCents: stake,
    expirationSeconds: partial.expirationSeconds ?? 60,
    result: partial.result,
    payoutPct: payout,
    profitCents: profit,
    profitIsManual: partial.profitIsManual ?? false,
    strategyId: partial.strategyId ?? null,
    notes: partial.notes ?? "",
    createdAt: partial.createdAt ?? partial.executedAt,
    updatedAt: partial.updatedAt ?? partial.executedAt,
  };
}

export function cash(partial: Partial<CashMovement> & { occurredAt: string; type: CashMovement["type"]; amountCents: number }): CashMovement {
  seq++;
  return {
    id: partial.id ?? `10000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    type: partial.type,
    amountCents: partial.amountCents,
    occurredAt: partial.occurredAt,
    note: partial.note ?? "",
    createdAt: partial.createdAt ?? partial.occurredAt,
  };
}

export function settings(partial: Partial<UserSettings> = {}): UserSettings {
  return { ...DEFAULT_SETTINGS, timezone: "America/Sao_Paulo", ...partial };
}
