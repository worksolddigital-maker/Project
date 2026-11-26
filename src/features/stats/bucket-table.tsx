"use client";

import type { Bucket } from "@/lib/domain/analytics";
import { formatMoney, formatPct } from "@/lib/domain/money";
import type { Currency } from "@/lib/domain/types";
import { MoneyText } from "@/features/trades/trade-bits";

/** Tabular view that accompanies ranking charts (accessible alternative to color). */
export function BucketTable({ buckets, nameOf, currency, label }: { buckets: Bucket[]; nameOf: (k: string) => string; currency: Currency; label: string }) {
  if (!buckets.length) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[460px] text-xs">
        <thead className="text-left text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium">{label}</th>
            <th className="px-3 py-2 text-right font-medium">Op.</th>
            <th className="px-3 py-2 text-right font-medium">W / L</th>
            <th className="px-3 py-2 text-right font-medium">Acerto</th>
            <th className="px-3 py-2 text-right font-medium">Investido</th>
            <th className="py-2 pl-3 text-right font-medium">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key} className="border-b border-line/60 last:border-0">
              <td className="max-w-[180px] truncate py-2 pr-3 text-fg">{nameOf(b.key)}</td>
              <td className="num px-3 py-2 text-right">{b.count}</td>
              <td className="num px-3 py-2 text-right">
                <span className="text-pos">{b.wins}</span> / <span className="text-neg">{b.losses}</span>
              </td>
              <td className="num px-3 py-2 text-right">{formatPct(b.winRate)}</td>
              <td className="num px-3 py-2 text-right text-muted">{formatMoney(b.stakeCents, currency)}</td>
              <td className="py-2 pl-3 text-right font-medium">
                <MoneyText cents={b.netCents} currency={currency} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
