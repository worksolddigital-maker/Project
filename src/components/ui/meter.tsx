"use client";

import { ProgressBar } from "./misc";

/** Consumption of a user-defined limit: neutral when unset, green → amber (80%) → red (100%). */
export function Meter({ label, current, limit, format, unit }: { label: string; current: number; limit: number | null; format: (v: number) => string; unit?: string }) {
  const pct = limit && limit > 0 ? (current / limit) * 100 : 0;
  const tone = !limit ? "neutral" : pct >= 100 ? "neg" : pct >= 80 ? "warn" : "pos";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="num text-fg">
          {format(current)}
          {limit ? <span className="text-subtle"> / {format(limit)}</span> : <span className="text-subtle"> · sem limite</span>}
          {unit}
        </span>
      </div>
      <ProgressBar value={pct} tone={tone} label={label} />
    </div>
  );
}
