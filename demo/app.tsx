import { useEffect, useState, type ReactNode } from "react";
import Template from "@/app/(app)/template";
import { AppShell } from "@/components/layout/app-shell";
import { LogoMark } from "@/components/layout/logo";
import { Providers } from "@/components/providers";
import { LoginForm, RegisterForm } from "@/features/auth/auth-forms";
import { BankrollView } from "@/features/bankroll/bankroll-view";
import { CalendarView } from "@/features/calendar/calendar-view";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { GoalsView } from "@/features/goals/goals-view";
import { JournalView } from "@/features/journal/journal-view";
import { MonitoringView } from "@/features/monitoring/monitoring-view";
import { ReportsView } from "@/features/reports/reports-view";
import { RiskView } from "@/features/risk/risk-view";
import { SecurityView } from "@/features/security/security-view";
import { SettingsView } from "@/features/settings/settings-view";
import { StatsView } from "@/features/stats/stats-view";
import { OperationsView } from "@/features/trades/operations-view";
import { getState, initStore } from "./backend/store";
import { DemoDock } from "./demo-dock";
import { navigate, useRoute } from "./router";

const SCREENS: Record<string, () => ReactNode> = {
  dashboard: () => <DashboardView />,
  monitoramento: () => <MonitoringView />,
  operacoes: () => <OperationsView />,
  banca: () => <BankrollView />,
  risco: () => <RiskView />,
  estatisticas: () => <StatsView />,
  calendario: () => <CalendarView />,
  diario: () => <JournalView />,
  metas: () => <GoalsView />,
  relatorios: () => <ReportsView />,
  seguranca: () => <SecurityView />,
  configuracoes: () => <SettingsView />,
};

function Boot() {
  return (
    <div className="relative z-10 grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark className="size-11" />
        <p className="text-sm text-muted">Carregando seus dados…</p>
      </div>
    </div>
  );
}

export function DemoApp() {
  const route = useRoute();
  const [loaded, setLoaded] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    void initStore().then(() => setLoaded(true));
  }, []);

  // `hardNavigate` (login, logout, account changes): switch screen with fresh caches.
  useEffect(() => {
    const onHard = (e: Event) => {
      navigate((e as CustomEvent<string>).detail);
      setGeneration((g) => g + 1);
    };
    window.addEventListener("demo:hard-navigate", onHard);
    return () => window.removeEventListener("demo:hard-navigate", onHard);
  }, []);

  const signedIn = loaded && getState().accounts.some((a) => a.id === getState().session);
  const isPublic = route === "login" || route === "cadastro";

  // Same guard as the server proxy: protected screens need a session.
  useEffect(() => {
    if (!loaded) return;
    if (!signedIn && !isPublic) navigate(getState().accounts.length ? "/login" : "/cadastro");
    else if (signedIn && (isPublic || !route)) navigate("/dashboard");
  }, [loaded, signedIn, isPublic, route]);

  if (!loaded) return <Boot />;

  let content: ReactNode;
  if (!signedIn) content = route === "login" ? <LoginForm /> : <RegisterForm />;
  else if (isPublic || !SCREENS[route]) content = <Boot />;
  else
    content = (
      <AppShell>
        <Template key={route}>{SCREENS[route]()}</Template>
      </AppShell>
    );

  return (
    <Providers key={generation}>
      {content}
      <DemoDock key={`dock-${generation}`} signedIn={signedIn} />
    </Providers>
  );
}
