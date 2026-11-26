"use client";

import { AnimatePresence, motion } from "motion/react";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAppData } from "@/hooks/app-data";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { hardNavigate } from "@/lib/navigation";
import { formatMoney } from "@/lib/domain/money";
import { Logo } from "./logo";
import { NAV_GROUPS, NAV_ITEMS } from "./nav";

const ORDER = new Map(NAV_ITEMS.map((item, i) => [item.href, i]));

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { alerts } = useAppData();
  const riskCount = alerts.filter((a) => a.level === "danger" || a.level === "warning").length;

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-0.5">
          {collapsed ? (
            <span className="mx-auto mb-1 h-px w-6 bg-line" aria-hidden />
          ) : (
            <p className="px-3 pb-1 text-[10.5px] font-medium tracking-[0.14em] text-subtle uppercase">{group.label}</p>
          )}
          {group.items.map((item) => {
            const i = ORDER.get(item.href) ?? 0;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group focus-ring relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors duration-200",
                    active ? "text-fg" : "text-muted hover:text-fg",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {active &&
                    (onNavigate ? (
                      // Mobile drawer: static indicator. A shared-layout animation inside an
                      // exiting drawer can block its unmount when reduced motion is on.
                      <span className="absolute inset-0 rounded-lg border border-line-strong bg-gradient-to-r from-white/[0.08] to-white/[0.02]">
                        <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-x-[1px] -translate-y-1/2 rounded-full bg-pos" />
                      </span>
                    ) : (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg border border-line-strong bg-gradient-to-r from-white/[0.08] to-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      >
                        <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-x-[1px] -translate-y-1/2 rounded-full bg-pos shadow-[0_0_12px_rgb(30_211_138/0.8)]" />
                      </motion.span>
                    ))}
                  <Icon
                    className={cn(
                      "relative z-10 size-[18px] shrink-0 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110",
                      active ? "text-fg" : "text-subtle group-hover:text-fg",
                    )}
                    strokeWidth={1.75}
                  />
                  {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                  {item.href === "/risco" && riskCount > 0 && (
                    <span
                      className={cn(
                        "relative z-10 grid min-w-5 place-items-center rounded-full bg-neg/90 px-1.5 text-[10px] font-semibold text-white",
                        collapsed ? "absolute top-1 right-1 h-4 min-w-4 px-1" : "ml-auto h-5",
                      )}
                      aria-label={`${riskCount} alertas de risco`}
                    >
                      {riskCount}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function BalanceCard() {
  const { portfolio, settings } = useAppData();
  if (!portfolio || !settings) return <div className="skeleton h-[74px] rounded-xl" />;
  const today = portfolio.todayStats.netCents;
  return (
    <div className="rounded-xl border border-line bg-gradient-to-b from-white/[0.04] to-transparent p-3">
      <p className="label-caps">Saldo atual</p>
      <p className="num mt-1 text-[15px] font-semibold text-fg">{formatMoney(portfolio.balanceCents, settings.currency)}</p>
      <p className={cn("num mt-0.5 text-xs", today > 0 ? "text-pos" : today < 0 ? "text-neg" : "text-muted")}>
        Hoje {formatMoney(today, settings.currency, { signed: true })}
      </p>
    </div>
  );
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    hardNavigate("/login");
  }
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  const { user } = useAppData();
  const initials = (user?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "flex-col")}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-white/[0.05] text-xs font-semibold text-fg">
        {initials}
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] text-fg">{user?.name ?? "…"}</span>
          <span className="block truncate text-[11px] text-subtle">{user?.email ?? ""}</span>
        </span>
      )}
      <button
        type="button"
        onClick={logout}
        className="focus-ring rounded-md p-1.5 text-subtle transition-colors hover:bg-white/[0.06] hover:text-neg"
        aria-label="Sair"
        title="Sair"
        data-testid="logout"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        "no-print fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-[#07090c]/80 backdrop-blur-xl transition-[width] duration-500 ease-[var(--ease-out-expo)] lg:flex",
        collapsed ? "w-[76px]" : "w-[260px]",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-line", collapsed ? "justify-center" : "justify-between px-4")}>
        <Link href="/dashboard" className="focus-ring rounded-lg" aria-label="Ir para o dashboard">
          <Logo collapsed={collapsed} />
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="focus-ring rounded-md p-1.5 text-subtle transition-colors hover:text-fg"
            aria-label="Recolher menu"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4" data-lenis-prevent>
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="focus-ring mb-3 flex h-9 w-full items-center justify-center rounded-lg text-subtle transition-colors hover:text-fg"
            aria-label="Expandir menu"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        <NavList collapsed={collapsed} />
      </div>
      <div className="space-y-3 border-t border-line p-3">
        {!collapsed && <BalanceCard />}
        <UserCard collapsed={collapsed} />
      </div>
    </aside>
  );
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" data-lenis-prevent>
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="glass-strong absolute inset-y-0 left-0 flex w-[86vw] max-w-[300px] flex-col"
            // Opacity keeps exits resolvable when reduced motion skips transforms.
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            aria-label="Menu"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button type="button" onClick={onClose} className="focus-ring rounded-md p-1.5 text-muted hover:text-fg" aria-label="Fechar menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavList collapsed={false} onNavigate={onClose} />
            </div>
            <div className="space-y-3 border-t border-line p-3">
              <BalanceCard />
              <UserCard collapsed={false} />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
