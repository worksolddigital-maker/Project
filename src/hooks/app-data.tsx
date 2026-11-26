"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePolled } from "@/hooks/use-client-store";
import { useCash, useJournal, useMe, useSettings, useStrategies, useTrades } from "@/lib/api/hooks";
import { buildPortfolio, NO_STRATEGY_KEY, type Portfolio } from "@/lib/domain/analytics";
import { todayKey } from "@/lib/domain/dates";
import { computeRiskMetrics, evaluateAlerts, type RiskAlert, type RiskMetrics } from "@/lib/domain/risk";
import type { CashMovement, JournalEntry, PublicUser, Strategy, Trade, UserSettings } from "@/lib/domain/types";

export interface AppData {
  ready: boolean;
  error: Error | null;
  refetch: () => void;
  user: PublicUser | undefined;
  settings: UserSettings | undefined;
  trades: Trade[];
  cash: CashMovement[];
  strategies: Strategy[];
  journal: JournalEntry[];
  portfolio: Portfolio | null;
  risk: RiskMetrics | null;
  alerts: RiskAlert[];
  strategyName: (id: string | null) => string;
  strategyMap: Map<string, Strategy>;
  journalLoading: boolean;
}

const Ctx = createContext<AppData | null>(null);

const EMPTY: never[] = [];

/** Computes every derived metric once and shares it with all pages. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const settingsQ = useSettings();
  const tradesQ = useTrades();
  const cashQ = useCash();
  const strategiesQ = useStrategies();
  const journalQ = useJournal();

  const settings = settingsQ.data;
  const trades = tradesQ.data ?? EMPTY;
  const cash = cashQ.data ?? EMPTY;
  const strategies = strategiesQ.data ?? EMPTY;
  const journal = journalQ.data ?? EMPTY;
  const tz = settings?.timezone ?? "America/Sao_Paulo";

  // Re-evaluate "today" when the calendar day changes in the user's timezone.
  // The server snapshot is empty: "now" must not be read during prerendering.
  const readDay = useCallback(() => todayKey(tz), [tz]);
  const day = usePolled(readDay, 30_000, "");

  const ready = !!settings && !!tradesQ.data && !!cashQ.data && !!strategiesQ.data;

  const portfolio = useMemo(
    () => (ready && settings ? buildPortfolio({ trades, cash, settings, now: new Date() }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, trades, cash, settings, day],
  );
  const risk = useMemo(() => (portfolio && settings ? computeRiskMetrics(portfolio, settings) : null), [portfolio, settings]);
  const alerts = useMemo(
    () => (portfolio && settings && risk ? evaluateAlerts(portfolio, settings, risk) : []),
    [portfolio, settings, risk],
  );
  const strategyMap = useMemo(() => new Map(strategies.map((s) => [s.id, s])), [strategies]);

  const error = (settingsQ.error || tradesQ.error || cashQ.error || strategiesQ.error) as Error | null;

  const value = useMemo<AppData>(
    () => ({
      ready,
      error,
      refetch: () => {
        void settingsQ.refetch();
        void tradesQ.refetch();
        void cashQ.refetch();
        void strategiesQ.refetch();
        void journalQ.refetch();
      },
      user: me.data,
      settings,
      trades,
      cash,
      strategies,
      journal,
      portfolio,
      risk,
      alerts,
      strategyMap,
      strategyName: (id) => {
        if (!id || id === NO_STRATEGY_KEY) return "Sem estratégia";
        return strategyMap.get(id)?.name ?? "Estratégia removida";
      },
      journalLoading: journalQ.isPending,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, error, me.data, settings, trades, cash, strategies, journal, portfolio, risk, alerts, strategyMap, journalQ.isPending],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}

/** Narrowed accessor for components rendered only after `ready`. */
export function useReadyData() {
  const d = useAppData();
  if (!d.ready || !d.settings || !d.portfolio || !d.risk) throw new Error("Data not ready");
  return d as AppData & { settings: UserSettings; portfolio: Portfolio; risk: RiskMetrics };
}
