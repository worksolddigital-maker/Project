"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, CircleCheck, Info, ShieldAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import type { AlertLevel } from "@/lib/domain/risk";

export const ALERT_STYLE: Record<AlertLevel, { icon: typeof Bell; text: string; ring: string; bg: string }> = {
  danger: { icon: ShieldAlert, text: "text-neg", ring: "border-neg/25", bg: "bg-neg/[0.07]" },
  warning: { icon: TriangleAlert, text: "text-warn", ring: "border-warn/25", bg: "bg-warn/[0.06]" },
  success: { icon: CircleCheck, text: "text-pos", ring: "border-pos/25", bg: "bg-pos/[0.06]" },
  info: { icon: Info, text: "text-info", ring: "border-info/25", bg: "bg-info/[0.06]" },
};

export function AlertsBell() {
  const { alerts } = useAppData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const critical = alerts.filter((a) => a.level === "danger").length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring relative grid size-10 place-items-center rounded-lg border border-line bg-white/[0.03] text-muted transition-colors hover:text-fg"
        aria-label={`Alertas (${alerts.length})`}
        aria-expanded={open}
        data-testid="alerts-bell"
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {alerts.length > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold",
              critical ? "bg-neg text-white" : "bg-fg text-bg",
            )}
          >
            {alerts.length}
            {critical > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-neg/60" />}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="glass-strong absolute right-0 z-50 mt-2 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-xl"
            data-lenis-prevent
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Central de alertas</p>
              <Link href="/risco" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-fg">
                Gestão de risco →
              </Link>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {alerts.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">Nenhum alerta ativo. Seus parâmetros estão dentro do definido.</p>
              ) : (
                alerts.map((a) => {
                  const s = ALERT_STYLE[a.level];
                  const Icon = s.icon;
                  return (
                    <div key={a.id} className={cn("mb-1.5 flex gap-3 rounded-lg border p-3 last:mb-0", s.ring, s.bg)}>
                      <Icon className={cn("mt-0.5 size-4 shrink-0", s.text)} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-fg">{a.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">{a.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Toasts newly triggered alerts after the initial load (e.g. right after saving a trade). */
export function AlertWatcher() {
  const { alerts, ready } = useAppData();
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<typeof alerts>([]);

  useEffect(() => {
    if (!ready) return;
    if (seen.current === null) {
      seen.current = new Set(alerts.map((a) => a.id));
      return;
    }
    const fresh = alerts.filter((a) => !seen.current!.has(a.id) && a.level !== "info");
    fresh.forEach((a) => seen.current!.add(a.id));
    if (fresh.length) setQueue(fresh);
  }, [alerts, ready]);

  return <AlertToaster queue={queue} onDone={() => setQueue([])} />;
}


function AlertToaster({ queue, onDone }: { queue: { id: string; level: AlertLevel; title: string; message: string }[]; onDone: () => void }) {
  const toast = useToast();
  useEffect(() => {
    if (!queue.length) return;
    for (const a of queue) {
      const tone = a.level === "danger" ? "error" : a.level === "warning" ? "warning" : a.level === "success" ? "success" : "info";
      toast.show({ tone, title: a.title, description: a.message }, a.level === "danger" ? 9000 : 6500);
    }
    onDone();
  }, [queue, toast, onDone]);
  return null;
}
