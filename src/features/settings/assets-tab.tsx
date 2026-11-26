"use client";

import { RotateCcw, Save, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Panel, Segmented } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { AssetBadge } from "@/features/trades/asset-picker";
import { useReadyData } from "@/hooks/app-data";
import { useUpdateSettings } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { ASSET_CATALOG, ASSET_CATEGORIES, ASSET_CATEGORY_LABELS, CATALOG_CAPTURED_AT, type AssetCategory } from "@/lib/domain/assets";
import { formatDayKey } from "@/lib/domain/dates";
import { parsePercent } from "@/lib/domain/money";

type Filter = "todos" | AssetCategory;

/** Reference payouts per asset (from the broker) with the account's own overrides and favorites. */
export function AssetsTab() {
  const { settings, trades } = useReadyData();
  const update = useUpdateSettings();
  const toast = useToast();
  const prefs = settings.assetPrefs;
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>(prefs.favorites);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of trades) m.set(t.asset, (m.get(t.asset) ?? 0) + 1);
    return m;
  }, [trades]);

  const rows = ASSET_CATALOG.filter((a) => (filter === "todos" || a.category === filter) && a.symbol.includes(query.trim().toUpperCase()));
  const valueOf = (symbol: string) => drafts[symbol] ?? (prefs.payouts[symbol] !== undefined ? String(prefs.payouts[symbol]).replace(".", ",") : "");
  const dirty = Object.keys(drafts).length > 0 || favorites.join("|") !== prefs.favorites.join("|");

  const save = async () => {
    const payouts: Record<string, number> = { ...prefs.payouts };
    const errs: Record<string, string> = {};
    for (const [symbol, raw] of Object.entries(drafts)) {
      if (!raw.trim()) {
        delete payouts[symbol];
        continue;
      }
      const v = parsePercent(raw);
      if (v === null || v < 1 || v > 500) errs[symbol] = "Use um valor entre 1 e 500.";
      else payouts[symbol] = Math.round(v * 100) / 100;
    }
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    try {
      await update.mutateAsync({ assetPrefs: { payouts, favorites } });
      setDrafts({});
      toast.success("Payouts salvos", "O formulário de operação passa a sugerir estes valores.");
    } catch (err) {
      toast.error("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    }
  };

  const restore = async () => {
    try {
      await update.mutateAsync({ assetPrefs: { payouts: {}, favorites } });
      setDrafts({});
      toast.success("Valores da corretora restaurados");
    } catch (err) {
      toast.error("Não foi possível restaurar", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Panel
      title="Ativos e payouts"
      subtitle={`Lista de ativos da corretora com o payout exibido em ${formatDayKey(CATALOG_CAPTURED_AT)}. O payout muda ao longo do dia: ajuste aqui o valor que você quer ver sugerido ao registrar uma operação.`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={restore} disabled={update.isPending || !Object.keys(prefs.payouts).length}>
            Restaurar valores da corretora
          </Button>
          <Button variant="primary" size="sm" icon={<Save className="size-3.5" />} onClick={save} loading={update.isPending} disabled={!dirty} data-testid="assets-save">
            Salvar
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<Filter>
          size="sm"
          ariaLabel="Categoria"
          value={filter}
          onChange={setFilter}
          options={[{ value: "todos", label: "Todos" }, ...ASSET_CATEGORIES.map((c) => ({ value: c as Filter, label: ASSET_CATEGORY_LABELS[c] }))]}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar um ativo…" className="h-9 w-52 pl-8 text-[13px]" aria-label="Pesquisar ativo" />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {filter === "acoes" ? "Nenhuma ação cadastrada no catálogo. Ações podem ser registradas digitando o nome no formulário de operação." : "Nenhum ativo encontrado."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]" data-testid="assets-table">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">Ativo</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 text-right font-medium">Payout da corretora</th>
                <th className="px-3 py-2 font-medium">Seu payout</th>
                <th className="px-3 py-2 text-right font-medium">Operações</th>
                <th className="py-2 pl-3 text-right font-medium">Favorito</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const fav = favorites.includes(a.symbol);
                return (
                  <tr key={a.symbol} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2.5">
                        <AssetBadge symbol={a.symbol} className="scale-90" />
                        <span className="font-medium text-fg">{a.symbol}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">{ASSET_CATEGORY_LABELS[a.category]}</td>
                    <td className="num px-3 py-2 text-right text-muted">{a.payoutPct === null ? "—" : `${a.payoutPct}%`}</td>
                    <td className="px-3 py-2">
                      <Input
                        value={valueOf(a.symbol)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [a.symbol]: e.target.value }))}
                        placeholder={a.payoutPct === null ? "Informe" : String(a.payoutPct)}
                        suffix="%"
                        inputMode="decimal"
                        className="h-8 w-24 text-[13px]"
                        aria-label={`Seu payout para ${a.symbol}`}
                        invalid={!!errors[a.symbol]}
                      />
                      {errors[a.symbol] && <p className="mt-1 text-[11px] text-neg">{errors[a.symbol]}</p>}
                    </td>
                    <td className="num px-3 py-2 text-right text-muted">{usage.get(a.symbol) ?? 0}</td>
                    <td className="py-2 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setFavorites((f) => (fav ? f.filter((x) => x !== a.symbol) : [...f, a.symbol]))}
                        className={cn("focus-ring rounded p-1 transition-colors", fav ? "text-warn" : "text-subtle hover:text-fg")}
                        aria-label={fav ? `Remover ${a.symbol} dos favoritos` : `Favoritar ${a.symbol}`}
                        aria-pressed={fav}
                      >
                        <Star className="size-4" fill={fav ? "currentColor" : "none"} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
