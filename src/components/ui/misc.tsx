"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ---------------------------------- Panel ---------------------------------- */

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  ...rest
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
} & Record<`data-${string}`, string | boolean | undefined>) {
  return (
    <section className={cn("glass rounded-2xl", className)} {...rest}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("px-5 pt-4 pb-5 sm:px-6", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

type BadgeTone = "pos" | "neg" | "warn" | "info" | "neutral";
const BADGE: Record<BadgeTone, string> = {
  pos: "bg-pos/12 text-pos border-pos/20",
  neg: "bg-neg/12 text-neg border-neg/20",
  warn: "bg-warn/12 text-warn border-warn/20",
  info: "bg-info/12 text-info border-info/20",
  neutral: "bg-white/[0.05] text-muted border-line",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-semibold tracking-wide whitespace-nowrap",
        BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- EmptyState ------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && (
        <div className="relative mb-4 grid size-12 place-items-center rounded-2xl border border-line bg-white/[0.03] text-muted">
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent" />
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

/* ------------------------------- Progress bar ------------------------------ */

type ProgressTone = "pos" | "neg" | "warn" | "neutral";
const BAR: Record<ProgressTone, string> = {
  pos: "bg-pos",
  neg: "bg-neg",
  warn: "bg-warn",
  neutral: "bg-fg/70",
};
const TRACK: Record<ProgressTone, string> = {
  pos: "bg-pos/12",
  neg: "bg-neg/12",
  warn: "bg-warn/12",
  neutral: "bg-white/[0.06]",
};

export function ProgressBar({
  value,
  tone = "neutral",
  className,
  label,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", TRACK[tone], className)}
    >
      <motion.div
        className={cn("h-full rounded-full", BAR[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/* --------------------------------- Segmented ------------------------------- */

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  tone?: "pos" | "neg" | "neutral";
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-lg border border-line bg-white/[0.025] p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-ring relative flex-1 rounded-md font-medium whitespace-nowrap transition-colors duration-200",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-[13px]",
              active
                ? o.tone === "pos"
                  ? "text-pos"
                  : o.tone === "neg"
                    ? "text-neg"
                    : "text-fg"
                : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className={cn(
                  "absolute inset-0 rounded-md border",
                  o.tone === "pos"
                    ? "border-pos/30 bg-pos/12"
                    : o.tone === "neg"
                      ? "border-neg/30 bg-neg/12"
                      : "border-line-strong bg-white/[0.08]",
                )}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Tabs ----------------------------------- */

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: ReactNode }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "focus-ring relative px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                className="absolute inset-x-2 -bottom-px h-px bg-fg"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- Value tone -------------------------------- */

export function toneOf(v: number | null | undefined): "pos" | "neg" | "neutral" {
  if (v === null || v === undefined || v === 0) return "neutral";
  return v > 0 ? "pos" : "neg";
}

export const TONE_TEXT = { pos: "text-pos", neg: "text-neg", neutral: "text-fg", warn: "text-warn" } as const;

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}
