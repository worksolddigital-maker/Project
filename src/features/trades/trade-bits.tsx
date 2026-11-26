"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";
import { formatExpiration, returnPct } from "@/lib/domain/trade-calc";
import { RESULT_LABELS, type Currency, type Direction, type Trade, type TradeResult } from "@/lib/domain/types";

export function DirectionBadge({ direction }: { direction: Direction }) {
  return direction === "CALL" ? (
    <Badge tone="pos">
      <ArrowUpRight className="size-3" /> CALL
    </Badge>
  ) : (
    <Badge tone="neg">
      <ArrowDownRight className="size-3" /> PUT
    </Badge>
  );
}

export function ResultBadge({ result }: { result: TradeResult }) {
  return <Badge tone={result === "WIN" ? "pos" : result === "LOSS" ? "neg" : "neutral"}>{RESULT_LABELS[result]}</Badge>;
}

export function MoneyText({ cents, currency, signed = true, className }: { cents: number; currency: Currency; signed?: boolean; className?: string }) {
  return (
    <span className={cn("num", cents > 0 ? "text-pos" : cents < 0 ? "text-neg" : "text-muted", className)}>
      {formatMoney(cents, currency, { signed })}
    </span>
  );
}

/** Compact list row used on dashboard, calendar and day details. */
export function TradeRow({
  trade,
  currency,
  tz,
  strategyName,
  onClick,
}: {
  trade: Trade;
  currency: Currency;
  tz: string;
  strategyName?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors",
        onClick && "focus-ring hover:border-line hover:bg-white/[0.03]",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg border",
          trade.direction === "CALL" ? "border-pos/20 bg-pos/10 text-pos" : "border-neg/20 bg-neg/10 text-neg",
        )}
        aria-label={trade.direction}
      >
        {trade.direction === "CALL" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-fg">{trade.asset}</span>
          <ResultBadge result={trade.result} />
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-subtle">
          {formatDateTime(trade.executedAt, tz)} · {formatExpiration(trade.expirationSeconds)}
          {strategyName ? ` · ${strategyName}` : ""}
        </span>
      </span>
      <span className="text-right">
        <MoneyText cents={trade.profitCents} currency={currency} className="block text-[13px] font-semibold" />
        <span className="num block text-[11px] text-subtle">
          {formatMoney(trade.stakeCents, currency)} · {formatPct(returnPct(trade.profitCents, trade.stakeCents), { signed: true })}
        </span>
      </span>
    </Comp>
  );
}
