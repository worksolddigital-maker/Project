"use client";

import { CircleDot, KeyRound, LogIn, LogOut, ShieldAlert, ShieldX } from "lucide-react";
import { formatDateTime } from "@/lib/domain/dates";
import type { Currency } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import type { AuditEvent } from "@/lib/security";
import { describeEvent, timeAgo } from "./describe";

const ICONS: Partial<Record<string, typeof CircleDot>> = {
  "auth.login": LogIn,
  "auth.register": LogIn,
  "auth.logout": LogOut,
  "auth.login_failed": ShieldAlert,
  "auth.locked": ShieldX,
  "auth.password_changed": KeyRound,
};

const DOT = { pos: "bg-pos", neg: "bg-neg", warn: "bg-warn", neutral: "bg-subtle" } as const;
const TEXT = { pos: "text-pos", neg: "text-neg", warn: "text-warn", neutral: "text-muted" } as const;

/** Timeline of account events, newest first. */
export function EventList({
  events,
  currency,
  timezone,
  showIp,
  emptyText,
  testId,
}: {
  events: AuditEvent[];
  currency: Currency;
  timezone: string;
  showIp?: boolean;
  emptyText: string;
  testId?: string;
}) {
  if (!events.length) return <p className="py-8 text-center text-sm text-muted">{emptyText}</p>;
  return (
    <ol className="relative space-y-0.5" data-testid={testId}>
      {events.map((e) => {
        const d = describeEvent(e, currency);
        const Icon = ICONS[e.action];
        return (
          <li key={e.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.025]">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center">
              {Icon ? <Icon className={cn("size-4", TEXT[d.tone])} /> : <span className={cn("size-2 rounded-full", DOT[d.tone])} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-fg">{d.title}</p>
              {d.detail && <p className={cn("num truncate text-xs", d.tone === "pos" || d.tone === "neg" ? TEXT[d.tone] : "text-muted")}>{d.detail}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted" title={formatDateTime(e.createdAt, timezone, true)}>
                {timeAgo(e.createdAt)}
              </p>
              {showIp && e.ip && <p className="mono text-[10.5px] text-subtle">{e.ip}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
