"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type {
  CashMovement,
  JournalEntry,
  PublicUser,
  Strategy,
  Trade,
  UserSettings,
} from "@/lib/domain/types";
import type { CashMovementInput, JournalInput, SettingsUpdate, TradeInput } from "@/lib/validation/schemas";
import { api } from "./client";

export const qk = {
  me: ["me"] as const,
  settings: ["settings"] as const,
  trades: ["trades"] as const,
  cash: ["cash"] as const,
  strategies: ["strategies"] as const,
  journal: ["journal"] as const,
};

export const useMe = () =>
  useQuery({ queryKey: qk.me, queryFn: () => api<{ user: PublicUser }>("/api/auth/me").then((r) => r.user) });

export const useSettings = () =>
  useQuery({
    queryKey: qk.settings,
    queryFn: () => api<{ settings: UserSettings }>("/api/settings").then((r) => r.settings),
  });

export const useTrades = () =>
  useQuery({ queryKey: qk.trades, queryFn: () => api<{ trades: Trade[] }>("/api/trades").then((r) => r.trades) });

export const useCash = () =>
  useQuery({
    queryKey: qk.cash,
    queryFn: () => api<{ movements: CashMovement[] }>("/api/cash-movements").then((r) => r.movements),
  });

export const useStrategies = () =>
  useQuery({
    queryKey: qk.strategies,
    queryFn: () => api<{ strategies: Strategy[] }>("/api/strategies").then((r) => r.strategies),
  });

export const useJournal = () =>
  useQuery({
    queryKey: qk.journal,
    queryFn: () => api<{ entries: JournalEntry[] }>("/api/journal").then((r) => r.entries),
  });

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: QueryKey[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
}

/* --------------------------------- Trades --------------------------------- */

export function useSaveTrade() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TradeInput }) =>
      id
        ? api<{ trade: Trade }>(`/api/trades/${id}`, { method: "PATCH", json: input }).then((r) => r.trade)
        : api<{ trade: Trade }>("/api/trades", { method: "POST", json: input }).then((r) => r.trade),
    onSuccess: () => invalidate(qk.trades),
  });
}

export function useDeleteTrade() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api(`/api/trades/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(qk.trades, qk.journal),
  });
}

export function useDeleteAllTrades() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api<{ deleted: number }>("/api/trades", { method: "DELETE", json: { confirmation: "EXCLUIR" } }),
    onSuccess: () => invalidate(qk.trades, qk.journal),
  });
}

/* ------------------------------ Cash movements ----------------------------- */

export function useSaveCash() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CashMovementInput }) =>
      id
        ? api(`/api/cash-movements/${id}`, { method: "PATCH", json: input })
        : api("/api/cash-movements", { method: "POST", json: input }),
    onSuccess: () => invalidate(qk.cash),
  });
}

export function useDeleteCash() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api(`/api/cash-movements/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(qk.cash),
  });
}

/* --------------------------------- Settings -------------------------------- */

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsUpdate) =>
      api<{ settings: UserSettings }>("/api/settings", { method: "PATCH", json: patch }).then((r) => r.settings),
    onSuccess: (settings) => qc.setQueryData(qk.settings, settings),
  });
}

/* -------------------------------- Strategies ------------------------------- */

export function useSaveStrategy() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: { name: string; description: string } }) =>
      id
        ? api<{ strategy: Strategy }>(`/api/strategies/${id}`, { method: "PATCH", json: input }).then((r) => r.strategy)
        : api<{ strategy: Strategy }>("/api/strategies", { method: "POST", json: input }).then((r) => r.strategy),
    onSuccess: () => invalidate(qk.strategies),
  });
}

export function useDeleteStrategy() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api(`/api/strategies/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(qk.strategies, qk.trades, qk.journal),
  });
}

/* --------------------------------- Journal --------------------------------- */

export function useSaveJournal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: JournalInput }) =>
      id
        ? api(`/api/journal/${id}`, { method: "PATCH", json: input })
        : api("/api/journal", { method: "POST", json: input }),
    onSuccess: () => invalidate(qk.journal),
  });
}

export function useDeleteJournal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api(`/api/journal/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(qk.journal),
  });
}

/* --------------------------------- Account --------------------------------- */

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string }) =>
      api<{ user: PublicUser }>("/api/account", { method: "PATCH", json: input }).then((r) => r.user),
    onSuccess: (user) => qc.setQueryData(qk.me, user),
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
