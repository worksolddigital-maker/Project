"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useStoredFlag } from "@/hooks/use-client-store";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { TradeModalProvider } from "@/features/trades/trade-modal-context";
import { AppDataProvider, useAppData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import { AlertWatcher } from "./alerts-bell";
import { MobileNav, Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const COLLAPSE_KEY = "td:sidebar-collapsed";

function ShellInner({ children }: { children: ReactNode }) {
  const { settings } = useAppData();
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSE_KEY);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduced = settings?.reducedMotion ?? false;

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
  }, [reduced]);

  const toggle = () => setCollapsed(!collapsed);

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <SmoothScroll enabled={!!settings && settings.smoothScroll && !reduced} />
      <a
        href="#conteudo"
        className="focus-ring fixed top-2 left-2 z-[90] -translate-y-20 rounded-md bg-fg px-3 py-2 text-sm text-bg focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div
        className={cn(
          "relative z-10 min-h-dvh transition-[padding] duration-500 ease-[var(--ease-out-expo)]",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]",
        )}
      >
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main id="conteudo" className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
      <AlertWatcher />
    </MotionConfig>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
      <TradeModalProvider>
        <ShellInner>{children}</ShellInner>
      </TradeModalProvider>
    </AppDataProvider>
  );
}
