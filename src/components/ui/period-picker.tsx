"use client";

import { Input, Select } from "@/components/ui/form";
import { PERIOD_LABELS, PERIOD_PRESETS, resolvePreset, type DateRange, type DayKey, type PeriodPreset } from "@/lib/domain/dates";

export interface PeriodValue {
  preset: PeriodPreset | "custom";
  from: string;
  to: string;
}

export function rangeOf(v: PeriodValue, today: DayKey): DateRange {
  if (v.preset === "custom") return { from: v.from || null, to: v.to || null };
  return resolvePreset(v.preset, today);
}

export function periodLabel(v: PeriodValue): string {
  if (v.preset !== "custom") return PERIOD_LABELS[v.preset];
  const fmt = (s: string) => s.split("-").reverse().join("/");
  if (v.from && v.to) return `${fmt(v.from)} a ${fmt(v.to)}`;
  if (v.from) return `Desde ${fmt(v.from)}`;
  if (v.to) return `Até ${fmt(v.to)}`;
  return "Todo o período";
}

export function PeriodPicker({ value, onChange, label = "Período", testId }: { value: PeriodValue; onChange: (v: PeriodValue) => void; label?: string; testId?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid={testId}>
      <Select
        aria-label={label}
        value={value.preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value as PeriodValue["preset"] })}
        className="h-9 w-auto min-w-[170px] text-[13px]"
      >
        {PERIOD_PRESETS.map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABELS[p]}
          </option>
        ))}
        <option value="custom">{PERIOD_LABELS.custom}</option>
      </Select>
      {value.preset === "custom" && (
        <>
          <Input type="date" aria-label="Data inicial" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className="h-9 w-auto text-[13px]" />
          <span className="text-xs text-subtle">até</span>
          <Input type="date" aria-label="Data final" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className="h-9 w-auto text-[13px]" />
        </>
      )}
    </div>
  );
}
