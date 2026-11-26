"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  show: (t: Omit<ToastItem, "id">, durationMs?: number) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CircleCheck, error: CircleAlert, warning: TriangleAlert, info: Info };
const TONES: Record<ToastTone, string> = {
  success: "text-pos",
  error: "text-neg",
  warning: "text-warn",
  info: "text-info",
};
const BARS: Record<ToastTone, string> = {
  success: "bg-pos",
  error: "bg-neg",
  warning: "bg-warn",
  info: "bg-info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback<ToastApi["show"]>(
    (t, durationMs = 4200) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) => show({ tone: "success", title, description }),
      error: (title, description) => show({ tone: "error", title, description }, 6000),
      warning: (title, description) => show({ tone: "warning", title, description }, 6500),
      info: (title, description) => show({ tone: "info", title, description }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="glass-strong pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl"
              >
                <span className={cn("absolute inset-y-0 left-0 w-[3px]", BARS[t.tone])} />
                <div className="flex items-start gap-3 py-3 pr-3 pl-4">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[t.tone])} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="focus-ring rounded-md p-1 text-subtle transition-colors hover:text-fg"
                    aria-label="Fechar notificação"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
