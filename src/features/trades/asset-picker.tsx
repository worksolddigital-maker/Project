"use client";

import { Coins, Droplet, Gem, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  ASSET_CATALOG,
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  assetMonogram,
  findAsset,
  suggestedPayout,
  type AssetCategory,
  type AssetPrefs,
} from "@/lib/domain/assets";

type Tab = "favoritos" | "recentes" | "todos" | AssetCategory;

const COMMODITY_ICON: Record<string, typeof Coins> = { PETRÓLEO: Droplet, OURO: Gem, PRATA: Gem, COBRE: Coins };

/** Compact asset mark: pair currencies for forex, monogram for the rest. */
export function AssetBadge({ symbol, className }: { symbol: string; className?: string }) {
  const info = findAsset(symbol);
  const parts = assetMonogram(symbol);
  if (info?.category === "commodities") {
    const Icon = COMMODITY_ICON[info.symbol] ?? Coins;
    return (
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border border-warn/25 bg-warn/10 text-warn", className)} aria-hidden>
        <Icon className="size-4" />
      </span>
    );
  }
  if (parts.length === 2) {
    return (
      <span className={cn("relative h-8 w-11 shrink-0", className)} aria-hidden>
        <span className="absolute top-0 left-0 grid size-7 place-items-center rounded-full border border-line-strong bg-surface-3 text-[8.5px] font-bold tracking-tight text-fg">
          {parts[0]}
        </span>
        <span className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full border border-line-strong bg-[#1d2430] text-[8.5px] font-bold tracking-tight text-muted">
          {parts[1]}
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
        info?.category === "cripto" ? "border-info/30 bg-info/10 text-info" : "border-line-strong bg-white/[0.05] text-fg",
        className,
      )}
      aria-hidden
    >
      {parts[0]}
    </span>
  );
}

interface AssetPickerProps {
  value: string;
  prefs: AssetPrefs;
  recent: string[];
  onPick: (symbol: string, payout: number | null) => void;
  onToggleFavorite?: (symbol: string) => void;
  onClose: () => void;
}

/** Asset browser shown under the asset field (search, categories, payouts, favorites). */
export function AssetPicker({ value, prefs, recent, onPick, onToggleFavorite, onClose }: AssetPickerProps) {
  const favorites = prefs.favorites;
  const [tab, setTab] = useState<Tab>(favorites.length ? "favoritos" : "todos");
  const query = value.trim().toUpperCase();

  const items = useMemo(() => {
    let list = [...ASSET_CATALOG];
    if (query && !findAsset(query)) {
      list = list.filter((a) => a.symbol.includes(query) || a.symbol.replace("/", "").includes(query.replace("/", "")));
    } else if (tab === "favoritos") {
      list = favorites.map((f) => findAsset(f) ?? { symbol: f, category: "forex" as const, payoutPct: null });
    } else if (tab === "recentes") {
      list = recent.map((r) => findAsset(r) ?? { symbol: r, category: "forex" as const, payoutPct: null });
    } else if (tab !== "todos") {
      list = list.filter((a) => a.category === tab);
    }
    return list;
  }, [query, tab, favorites, recent]);

  const searching = !!query && !findAsset(query);
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "favoritos", label: "Favoritos", show: favorites.length > 0 },
    { id: "recentes", label: "Recentes", show: recent.length > 0 },
    { id: "todos", label: "Todos", show: true },
    ...ASSET_CATEGORIES.map((c) => ({ id: c as Tab, label: ASSET_CATEGORY_LABELS[c], show: true })),
  ];

  return (
    <div className="rounded-xl border border-line-strong bg-[#0c0f14] p-3" data-testid="asset-picker" data-lenis-prevent>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {searching ? (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Search className="size-3.5" /> Resultados para “{value.trim()}”
          </p>
        ) : (
          <div role="tablist" aria-label="Categorias de ativos" className="flex flex-wrap gap-1">
            {tabs
              .filter((t) => t.show)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "focus-ring h-7 rounded-md px-2.5 text-xs transition-colors",
                    tab === t.id ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {t.label}
                </button>
              ))}
          </div>
        )}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClose} className="text-xs text-subtle hover:text-fg">
          Fechar
        </button>
      </div>

      {items.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-subtle">
          {tab === "acoes" && !searching
            ? "Nenhuma ação cadastrada. Digite o nome do ativo no campo acima para usá-lo."
            : "Nenhum ativo encontrado. O nome digitado será usado como ativo personalizado."}
        </p>
      ) : (
        <ul className="mt-2.5 grid max-h-[264px] grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-3">
          {items.map((a) => {
            const payout = suggestedPayout(a.symbol, prefs);
            const fav = favorites.includes(a.symbol);
            const selected = value.trim().toUpperCase() === a.symbol;
            return (
              <li key={a.symbol} className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(a.symbol, payout)}
                  className={cn(
                    "focus-ring flex w-full items-center gap-2.5 rounded-lg border p-2 pr-7 text-left transition-colors",
                    selected ? "border-pos/40 bg-pos/[0.08]" : "border-line bg-white/[0.02] hover:border-line-strong hover:bg-white/[0.05]",
                  )}
                  data-testid={`asset-option-${a.symbol}`}
                >
                  <AssetBadge symbol={a.symbol} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-fg">{a.symbol}</span>
                    <span className="block text-[11px] text-muted">
                      Lucro <span className={cn("num font-medium", payout === null ? "text-subtle" : "text-pos")}>{payout === null ? "—" : `${String(payout).replace(".", ",")}%`}</span>
                    </span>
                  </span>
                </button>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onToggleFavorite(a.symbol)}
                    className={cn("focus-ring absolute top-1.5 right-1.5 rounded p-0.5 transition-colors", fav ? "text-warn" : "text-subtle hover:text-fg")}
                    aria-label={fav ? `Remover ${a.symbol} dos favoritos` : `Favoritar ${a.symbol}`}
                    aria-pressed={fav}
                  >
                    <Star className="size-3.5" fill={fav ? "currentColor" : "none"} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
