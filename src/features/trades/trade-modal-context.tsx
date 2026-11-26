"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppData } from "@/hooks/app-data";
import type { Trade } from "@/lib/domain/types";
import { TradeFormModal } from "./trade-form";

interface TradeModalApi {
  openNew: (opts?: { dayKey?: string }) => void;
  openEdit: (trade: Trade) => void;
}

const Ctx = createContext<TradeModalApi | null>(null);

export function TradeModalProvider({ children }: { children: ReactNode }) {
  const { ready } = useAppData();
  const [state, setState] = useState<{ open: boolean; trade: Trade | null; dayKey?: string; nonce: number }>({ open: false, trade: null, nonce: 0 });

  const openNew = useCallback((opts?: { dayKey?: string }) => setState((s) => ({ open: true, trade: null, dayKey: opts?.dayKey, nonce: s.nonce + 1 })), []);
  const openEdit = useCallback((trade: Trade) => setState((s) => ({ open: true, trade, nonce: s.nonce + 1 })), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  // Keyboard shortcut: "N" opens a new operation (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.documentElement.classList.contains("modal-open")) return;
      if (!ready) return;
      e.preventDefault();
      openNew();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, ready]);

  const api = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {ready && <TradeFormModal key={state.nonce} open={state.open} onClose={close} trade={state.trade} defaultDayKey={state.dayKey} />}
    </Ctx.Provider>
  );
}

export function useTradeModal(): TradeModalApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTradeModal must be used inside TradeModalProvider");
  return ctx;
}
