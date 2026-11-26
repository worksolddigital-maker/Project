"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { WEEKDAY_LABELS_MON_FIRST } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import type { Currency } from "@/lib/domain/types";

/** Weekday × hour matrix. Diverging encoding: green (profit) ↔ neutral ↔ red (loss), intensity by magnitude. */
export function WeekdayHourHeatmap({ matrix, currency }: { matrix: { netCents: number; count: number }[][]; currency: Currency }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(1, ...matrix.flat().map((c) => Math.abs(c.netCents)));
  const activeHours = Array.from({ length: 24 }, (_, h) => h).filter((h) => matrix.some((row) => row[h].count > 0));
  if (!activeHours.length) {
    return <p className="py-10 text-center text-sm text-subtle">Sem operações no período selecionado.</p>;
  }
  const hours = Array.from({ length: Math.max(...activeHours) - Math.min(...activeHours) + 1 }, (_, i) => Math.min(...activeHours) + i);
  const cell = hover ? matrix[hover.d][hover.h] : null;

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `36px repeat(${hours.length}, minmax(22px, 56px))` }}>
          <span />
          {hours.map((h) => (
            <span key={h} className="mono text-center text-[10px] text-subtle">
              {String(h).padStart(2, "0")}
            </span>
          ))}
          {matrix.map((row, d) => (
            <div key={d} className="contents">
              <span className="self-center text-[11px] text-muted">{WEEKDAY_LABELS_MON_FIRST[d]}</span>
              {hours.map((h) => {
                const c = row[h];
                const intensity = c.count ? 0.18 + 0.82 * (Math.abs(c.netCents) / max) : 0;
                const bg = !c.count
                  ? "rgba(255,255,255,0.025)"
                  : c.netCents > 0
                    ? `rgba(30,211,138,${intensity.toFixed(3)})`
                    : c.netCents < 0
                      ? `rgba(245,71,92,${intensity.toFixed(3)})`
                      : "rgba(255,255,255,0.12)";
                return (
                  <button
                    key={h}
                    type="button"
                    onMouseEnter={() => setHover({ d, h })}
                    onFocus={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    className={cn("h-7 rounded-[4px] outline-none transition-transform hover:scale-110 focus-visible:ring-1 focus-visible:ring-white/50")}
                    style={{ background: bg }}
                    aria-label={`${WEEKDAY_LABELS_MON_FIRST[d]} ${h}h: ${c.count} operações, ${formatMoney(c.netCents, currency, { signed: true })}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex min-h-[20px] flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted">
          <span>Prejuízo</span>
          <span className="h-2 w-16 rounded-full bg-gradient-to-r from-neg via-white/10 to-pos" />
          <span>Lucro</span>
        </div>
        {hover && cell && (
          <span className="num text-muted">
            {WEEKDAY_LABELS_MON_FIRST[hover.d]} {String(hover.h).padStart(2, "0")}h · {cell.count} op ·{" "}
            <span className={cell.netCents > 0 ? "text-pos" : cell.netCents < 0 ? "text-neg" : "text-fg"}>{formatMoney(cell.netCents, currency, { signed: true })}</span>
          </span>
        )}
      </div>
    </div>
  );
}
