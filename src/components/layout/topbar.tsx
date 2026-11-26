"use client";

import { Menu, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTradeModal } from "@/features/trades/trade-modal-context";
import { useAppData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import { formatDayKey } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { AlertsBell } from "./alerts-bell";
import { navItemFor } from "./nav";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const item = navItemFor(pathname);
  const { portfolio, settings, ready } = useAppData();
  const { openNew } = useTradeModal();
  const today = portfolio?.todayStats;

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-[#060709]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="focus-ring -ml-1 grid size-10 place-items-center rounded-lg text-muted hover:text-fg lg:hidden"
          aria-label="Abrir menu"
          data-testid="mobile-menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{item?.label ?? "Trading Desk"}</p>
          <p className="hidden truncate text-xs text-subtle sm:block">
            {portfolio ? formatDayKey(portfolio.today, "long") : item?.description}
          </p>
        </div>
        {today && settings && (
          <div className="hidden items-center gap-4 rounded-lg border border-line bg-white/[0.025] px-3.5 py-1.5 md:flex">
            <div className="text-right">
              <p className="text-[10px] tracking-wider text-subtle uppercase">Resultado hoje</p>
              <p className={cn("num text-[13px] font-semibold", today.netCents > 0 ? "text-pos" : today.netCents < 0 ? "text-neg" : "text-fg")}>
                {formatMoney(today.netCents, settings.currency, { signed: true })}
              </p>
            </div>
            <span className="h-7 w-px bg-line" />
            <div className="text-right">
              <p className="text-[10px] tracking-wider text-subtle uppercase">Operações</p>
              <p className="num text-[13px] font-semibold text-fg">
                {today.count}
                <span className="ml-1.5 text-pos">{today.wins}W</span>
                <span className="ml-1 text-neg">{today.losses}L</span>
              </p>
            </div>
          </div>
        )}
        <AlertsBell />
        <Button variant="primary" onClick={() => openNew()} disabled={!ready} data-testid="new-trade" title="Nova operação (atalho: N)" className="max-sm:size-10 max-sm:px-0">
          <Plus className="size-4" />
          <span className="max-sm:sr-only">Nova operação</span>
        </Button>
      </div>
    </header>
  );
}
