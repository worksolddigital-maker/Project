"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Currency } from "@/lib/domain/types";

export const C = {
  pos: "#1ed38a",
  neg: "#f5475c",
  fg: "#e9ecf1",
  muted: "#8b93a1",
  subtle: "#5d6573",
  blue: "#7aa7ff",
  draw: "#b8bfca",
  grid: "rgba(255,255,255,0.055)",
  surface: "#0d1015",
};

export const axisTick = { fill: C.subtle, fontSize: 11, fontFamily: "var(--font-geist-mono)" };

export const axisCommon = {
  axisLine: false,
  tickLine: false,
  tick: axisTick,
} as const;

const axisFormatters = new Map<string, Intl.NumberFormat>();

/** Axis tick money: whole units below 100k, compact notation above. */
export function compactMoney(cents: number, currency: Currency) {
  const v = cents / 100;
  const compact = Math.abs(v) >= 100_000;
  const small = Math.abs(v) < 10;
  const key = `${currency}:${compact}:${small}`;
  let f = axisFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : small ? 2 : 0,
      minimumFractionDigits: 0,
    });
    axisFormatters.set(key, f);
  }
  const out = f.format(Math.abs(v));
  return v < 0 ? `−${out}` : out;
}

export function ChartTooltipBox({ title, rows }: { title?: ReactNode; rows: { label: ReactNode; value: ReactNode; color?: string; tone?: "pos" | "neg" | "neutral" }[] }) {
  return (
    <div className="glass-strong min-w-[170px] rounded-lg px-3 py-2.5 text-xs shadow-2xl">
      {title && <p className="mb-1.5 font-medium text-fg">{title}</p>}
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className={cn("num font-medium", r.tone === "pos" ? "text-pos" : r.tone === "neg" ? "text-neg" : "text-fg")}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; kind?: "dot" | "line" }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.kind === "line" ? (
            <span className="h-[2px] w-3.5 rounded-full" style={{ background: i.color }} />
          ) : (
            <span className="size-2 rounded-full" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function ChartEmpty({ height = 260, message = "Sem dados no período selecionado." }: { height?: number; message?: string }) {
  return (
    <div
      className="grid place-items-center rounded-xl border border-dashed border-line text-center text-sm text-subtle"
      style={{ height }}
    >
      {message}
    </div>
  );
}

export const toneOfValue = (v: number): "pos" | "neg" | "neutral" => (v > 0 ? "pos" : v < 0 ? "neg" : "neutral");
