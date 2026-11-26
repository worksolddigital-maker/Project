"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, MessageSquareText, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, Panel, Segmented } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useReadyData } from "@/hooks/app-data";
import { downloadFile } from "@/lib/api/client";
import { useDeleteTrade } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { summarize } from "@/lib/domain/analytics";
import { dayKeyOf, formatDateTime } from "@/lib/domain/dates";
import { formatMoney, formatNumber, formatPct } from "@/lib/domain/money";
import { formatExpiration, returnPct } from "@/lib/domain/trade-calc";
import type { Trade } from "@/lib/domain/types";
import { AssetBadge } from "./asset-picker";
import { ImportWizard } from "./import-wizard";
import { DirectionBadge, MoneyText, ResultBadge } from "./trade-bits";
import { useTradeModal } from "./trade-modal-context";

type SortKey = "date" | "asset" | "stake" | "profit" | "return";
type ResultFilter = "all" | "WIN" | "LOSS" | "DRAW";
type DirectionFilter = "all" | "CALL" | "PUT";

interface Filters {
  search: string;
  from: string;
  to: string;
  result: ResultFilter;
  direction: DirectionFilter;
  strategy: string; // "all" | "none" | id
}

const EMPTY_FILTERS: Filters = { search: "", from: "", to: "", result: "all", direction: "all", strategy: "all" };

function SortHeader({ label, k, sort, onSort, align = "left" }: { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void; align?: "left" | "right" }) {
  const active = sort.key === k;
  return (
    <th className={cn("px-3 py-3 font-medium", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn("focus-ring inline-flex items-center gap-1 rounded transition-colors hover:text-fg", active && "text-fg")}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
}

function OperationsContent() {
  const { trades, settings, strategies, strategyName } = useReadyData();
  const { openNew, openEdit } = useTradeModal();
  const toast = useToast();
  const del = useDeleteTrade();
  const tz = settings.timezone;
  const cur = settings.currency;
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [toDelete, setToDelete] = useState<Trade | null>(null);
  // Rendered only on the client (behind DataGate): the query string can seed state.
  const [importOpen, setImportOpen] = useState(() => new URLSearchParams(window.location.search).get("importar") === "1");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("importar")) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = filters.search.trim().toUpperCase();
    return trades.filter((t) => {
      if (q && !t.asset.toUpperCase().includes(q)) return false;
      if (filters.result !== "all" && t.result !== filters.result) return false;
      if (filters.direction !== "all" && t.direction !== filters.direction) return false;
      if (filters.strategy === "none" && t.strategyId) return false;
      if (filters.strategy !== "all" && filters.strategy !== "none" && t.strategyId !== filters.strategy) return false;
      if (filters.from || filters.to) {
        const d = dayKeyOf(t.executedAt, tz);
        if (filters.from && d < filters.from) return false;
        if (filters.to && d > filters.to) return false;
      }
      return true;
    });
  }, [trades, filters, tz]);

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (t: Trade): number | string => {
      switch (sort.key) {
        case "asset":
          return t.asset;
        case "stake":
          return t.stakeCents;
        case "profit":
          return t.profitCents;
        case "return":
          return returnPct(t.profitCents, t.stakeCents);
        default:
          return t.executedAt;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va === vb) return (a.executedAt < b.executedAt ? 1 : -1) * (sort.key === "date" ? -dir : 1);
      return (va < vb ? -1 : 1) * dir;
    });
  }, [filtered, sort]);

  const summary = useMemo(() => summarize(filtered), [filtered]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = sorted.slice(current * pageSize, current * pageSize + pageSize);
  const activeFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "asset" ? "asc" : "desc" }));

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success("Operação excluída", `${toDelete.asset} · ${formatDateTime(toDelete.executedAt, tz)}`);
      setToDelete(null);
    } catch (err) {
      toast.error("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams({ format: "csv" });
      if (filters.from) q.set("from", filters.from);
      if (filters.to) q.set("to", filters.to);
      await downloadFile(`/api/export?${q}`, "operacoes.csv");
    } catch (err) {
      toast.error("Falha na exportação", err instanceof Error ? err.message : undefined);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Operações"
        description="Registre, edite e acompanhe o histórico completo. Lucro e retorno são calculados automaticamente."
        actions={
          <>
            <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)} data-testid="open-import">
              Importar
            </Button>
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv} loading={exporting} disabled={!trades.length}>
              Exportar CSV
            </Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => openNew()}>
              Nova operação
            </Button>
          </>
        }
      />

      <Panel className="mb-4" bodyClassName="pt-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(2,1fr)_1.2fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <Input
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Pesquisar ativo…"
              className="pl-9"
              aria-label="Pesquisar por ativo"
              data-testid="filter-search"
            />
          </div>
          <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set("from", e.target.value)} aria-label="Data inicial" data-testid="filter-from" />
          <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)} aria-label="Data final" data-testid="filter-to" />
          <Select value={filters.strategy} onChange={(e) => set("strategy", e.target.value)} aria-label="Filtrar por estratégia" data-testid="filter-strategy">
            <option value="all">Todas as estratégias</option>
            <option value="none">Sem estratégia</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={filters.direction} onChange={(e) => set("direction", e.target.value as DirectionFilter)} aria-label="Filtrar por tipo">
            <option value="all">CALL e PUT</option>
            <option value="CALL">Somente CALL</option>
            <option value="PUT">Somente PUT</option>
          </Select>
          <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!activeFilters} icon={<X className="size-4" />}>
            Limpar
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Segmented<ResultFilter>
            size="sm"
            ariaLabel="Filtrar por resultado"
            value={filters.result}
            onChange={(v) => set("result", v)}
            options={[
              { value: "all", label: "Todos" },
              { value: "WIN", label: "WIN", tone: "pos" },
              { value: "LOSS", label: "LOSS", tone: "neg" },
              { value: "DRAW", label: "Empate" },
            ]}
          />
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs" data-testid="filter-summary">
            <div className="flex gap-1.5">
              <dt className="text-muted">Operações</dt>
              <dd className="num font-medium text-fg">{formatNumber(summary.count)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted">Resultado</dt>
              <dd className="font-medium">
                <MoneyText cents={summary.netCents} currency={cur} />
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted">Acerto</dt>
              <dd className="num font-medium text-fg">{formatPct(summary.winRate)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted">Investido</dt>
              <dd className="num font-medium text-fg">{formatMoney(summary.totalStakeCents, cur)}</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Panel bodyClassName="p-0">
        {trades.length === 0 ? (
          <EmptyState
            icon={<Plus className="size-5" />}
            title="Nenhuma operação registrada ainda"
            description="Comece registrando sua primeira operação ou importe o histórico em CSV/Excel."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={() => openNew()}>
                  Registrar operação
                </Button>
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  Importar histórico
                </Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Nenhuma operação encontrada"
            description="Ajuste os filtros para ver outros resultados."
            action={
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px] text-[13px]" data-testid="trades-table">
                <thead className="border-b border-line text-left text-xs text-muted">
                  <tr>
                    <SortHeader label="Data e hora" k="date" sort={sort} onSort={onSort} />
                    <SortHeader label="Ativo" k="asset" sort={sort} onSort={onSort} />
                    <th className="px-3 py-3 font-medium">Tipo</th>
                    <SortHeader label="Valor" k="stake" sort={sort} onSort={onSort} align="right" />
                    <th className="px-3 py-3 font-medium">Expiração</th>
                    <th className="px-3 py-3 text-right font-medium">Payout</th>
                    <th className="px-3 py-3 font-medium">Resultado</th>
                    <SortHeader label="Lucro/prejuízo" k="profit" sort={sort} onSort={onSort} align="right" />
                    <SortHeader label="Retorno" k="return" sort={sort} onSort={onSort} align="right" />
                    <th className="px-3 py-3 font-medium">Estratégia</th>
                    <th className="px-3 py-3 text-right font-medium">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const ret = returnPct(t.profitCents, t.stakeCents);
                    return (
                      <tr key={t.id} className="group border-b border-line/70 transition-colors last:border-0 hover:bg-white/[0.025]" data-testid="trade-row">
                        <td className="num px-3 py-3 whitespace-nowrap text-muted">{formatDateTime(t.executedAt, tz, true)}</td>
                        <td className="px-3 py-3 font-medium whitespace-nowrap text-fg">
                          <span className="inline-flex items-center gap-2">
                            <AssetBadge symbol={t.asset} className="scale-75" />
                            {t.asset}
                            {t.notes && (
                              <span title={t.notes} className="text-subtle">
                                <MessageSquareText className="size-3.5" />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <DirectionBadge direction={t.direction} />
                        </td>
                        <td className="num px-3 py-3 text-right">{formatMoney(t.stakeCents, cur)}</td>
                        <td className="px-3 py-3 text-muted">{formatExpiration(t.expirationSeconds)}</td>
                        <td className="num px-3 py-3 text-right text-muted">{t.payoutPct === null ? "—" : formatPct(t.payoutPct)}</td>
                        <td className="px-3 py-3">
                          <ResultBadge result={t.result} />
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          <MoneyText cents={t.profitCents} currency={cur} />
                          {t.profitIsManual && <span className="ml-1 text-[10px] text-subtle" title="Valor informado manualmente">M</span>}
                        </td>
                        <td className={cn("num px-3 py-3 text-right", ret > 0 ? "text-pos" : ret < 0 ? "text-neg" : "text-muted")}>{formatPct(ret, { signed: true })}</td>
                        <td className="max-w-[160px] truncate px-3 py-3 text-muted">{t.strategyId ? strategyName(t.strategyId) : "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                            <Button size="icon-sm" variant="ghost" onClick={() => openEdit(t)} aria-label={`Editar operação ${t.asset}`} data-testid="edit-trade">
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setToDelete(t)}
                              aria-label={`Excluir operação ${t.asset}`}
                              className="hover:text-neg"
                              data-testid="delete-trade"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line lg:hidden">
              {rows.map((t) => (
                <li key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{t.asset}</span>
                        <DirectionBadge direction={t.direction} />
                        <ResultBadge result={t.result} />
                      </div>
                      <p className="num mt-1 text-xs text-subtle">
                        {formatDateTime(t.executedAt, tz)} · {formatExpiration(t.expirationSeconds)}
                        {t.payoutPct !== null && ` · ${formatPct(t.payoutPct)}`}
                      </p>
                      {t.strategyId && <p className="mt-0.5 text-xs text-muted">{strategyName(t.strategyId)}</p>}
                    </div>
                    <div className="text-right">
                      <MoneyText cents={t.profitCents} currency={cur} className="block font-semibold" />
                      <span className="num text-xs text-subtle">{formatMoney(t.stakeCents, cur)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button size="xs" variant="secondary" onClick={() => openEdit(t)} icon={<Pencil className="size-3" />}>
                      Editar
                    </Button>
                    <Button size="xs" variant="secondary" onClick={() => setToDelete(t)} icon={<Trash2 className="size-3" />} className="hover:text-neg">
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted sm:px-6">
              <div className="flex items-center gap-2">
                <span>Por página</span>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="h-8 w-20 text-xs"
                  aria-label="Itens por página"
                >
                  {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <span className="num">
                  {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} de {sorted.length}
                </span>
                <Button size="icon-sm" variant="secondary" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Página anterior">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button size="icon-sm" variant="secondary" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Próxima página">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Excluir operação?"
        confirmLabel="Excluir operação"
        description={
          toDelete && (
            <>
              A operação <strong className="text-fg">{toDelete.asset}</strong> de {formatDateTime(toDelete.executedAt, tz)} (
              <MoneyText cents={toDelete.profitCents} currency={cur} />) será removida permanentemente. Saldo, estatísticas e metas serão recalculados.
            </>
          )
        }
      />
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

export function OperationsView() {
  return (
    <DataGate>
      <OperationsContent />
    </DataGate>
  );
}
