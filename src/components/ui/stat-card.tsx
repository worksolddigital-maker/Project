"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/cn";

type Tone = "pos" | "neg" | "neutral" | "warn";
const TONE: Record<Tone, string> = { pos: "text-pos", neg: "text-neg", neutral: "text-fg", warn: "text-warn" };
const GLOW: Record<Tone, string> = {
  pos: "rgb(30 211 138 / 0.13)",
  neg: "rgb(245 71 92 / 0.13)",
  neutral: "rgb(255 255 255 / 0.07)",
  warn: "rgb(242 179 61 / 0.12)",
};

export interface StatCardProps {
  label: string;
  value: number | null;
  format: (v: number) => string;
  tone?: Tone;
  icon?: ReactNode;
  sub?: ReactNode;
  emphasis?: boolean;
  testId?: string;
  className?: string;
}

/** KPI tile with animated value and a cursor-following spotlight (depth hover). */
export function StatCard({ label, value, format, tone = "neutral", icon, sub, emphasis, testId, className }: StatCardProps) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16, filter: "blur(6px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group glass @container relative min-w-0 overflow-hidden rounded-2xl p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong sm:p-5",
        className,
      )}
      style={{ ["--glow" as string]: GLOW[tone] }}
      data-testid={testId}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), var(--glow), transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="label-caps leading-snug">{label}</p>
        {icon && <span className="text-subtle transition-colors group-hover:text-muted">{icon}</span>}
      </div>
      <p
        className={cn(
          "num relative mt-2.5 font-semibold tracking-tight whitespace-nowrap",
          emphasis ? "text-lg @[180px]:text-xl @[220px]:text-2xl @[260px]:text-[28px]" : "text-base @[170px]:text-lg @[210px]:text-[22px]",
          TONE[tone],
        )}
      >
        {value === null ? <span className="text-subtle">—</span> : <CountUp value={value} format={format} />}
      </p>
      {sub && <div className="relative mt-1.5 text-xs text-muted">{sub}</div>}
    </motion.div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.045 } } }}
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}
    >
      {children}
    </motion.div>
  );
}
