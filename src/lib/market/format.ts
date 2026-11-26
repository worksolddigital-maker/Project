import type { Quote } from "./types";

const nf = (min: number, max: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

/** Decimals that keep a price readable: big numbers whole, small ones precise. */
function digits(q: Quote): [number, number] {
  const v = Math.abs(q.price);
  if (q.unit === "pts") return [0, 0];
  if (q.unit === "%" || q.unit === "% a.a.") return [2, 2];
  if (q.category === "cambio") return v >= 20 ? [2, 2] : [4, 4];
  if (v >= 1000) return [0, 0];
  if (v >= 1) return [2, 2];
  if (v >= 0.01) return [4, 4];
  return [6, 6];
}

export function formatQuotePrice(q: Quote): string {
  const [min, max] = digits(q);
  const n = nf(min, max).format(q.price);
  switch (q.unit) {
    case "BRL":
      return `R$ ${n}`;
    case "USD":
      return `US$ ${n}`;
    case "pts":
      return `${n} pts`;
    case "% a.a.":
      return `${n}% a.a.`;
    case "":
      return n;
    default:
      return `${n} ${q.unit}`;
  }
}

const pct2 = nf(2, 2);

export function formatChange(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const abs = pct2.format(Math.abs(v));
  if (abs === "0,00") return "0,00%";
  return `${v > 0 ? "+" : "−"}${abs}%`;
}

export const changeTone = (v: number | null): "pos" | "neg" | "neutral" => (v === null || Math.abs(v) < 0.005 ? "neutral" : v > 0 ? "pos" : "neg");
