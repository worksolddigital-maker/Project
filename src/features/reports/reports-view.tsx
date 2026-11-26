"use client";

import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/misc";
import { PeriodPicker, periodLabel, rangeOf, type PeriodValue } from "@/components/ui/period-picker";
import { useToast } from "@/components/ui/toast";
import { BucketTable } from "@/features/stats/bucket-table";
import { MoneyText } from "@/features/trades/trade-bits";
import { useReadyData } from "@/hooks/app-data";
import { downloadFile } from "@/lib/api/client";
import { filterByRange, groupByAsset, groupByDay, groupByStrategy, summarize } from "@/lib/domain/analytics";
import { dayKeyOf, formatDateTime, formatDayKey, inRange } from "@/lib/domain/dates";
import { formatMoney, formatNumber, formatPct } from "@/lib/domain/money";

function ReportsContent() {
  const { portfolio: p, settings, cash, user, strategyName } = useReadyData();
  const toast = useToast();
  const cur = settings.currency;
  const [period, setPeriod] = useState<PeriodValue>({ preset: "thisMonth", from: "", to: "" });
  const [busy, setBusy] = useState<"csv" | "xlsx" | null>(null);
  const range = rangeOf(period, p.today);

  const report = useMemo(() => {
    const trades = filterByRange(p.sortedTrades, range, p.tz);
    const days = [...groupByDay(trades, p.tz, p.ledger.dayStartBalance).values()].sort((a, b) => (a.key < b.key ? -1 : 1));
    return {
      trades,
      summary: summarize(trades),
      assets: groupByAsset(trades),
      strategies: groupByStrategy(trades),
      days,
      cash: cash.filter((c) => inRange(dayKeyOf(c.occurredAt, p.tz), range)).sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, cash, range.from, range.to]);

  const exportFile = async (format: "csv" | "xlsx") => {
    setBusy(format);
    try {
      const q = new URLSearchParams({ format });
      if (range.from) q.set("from", range.from);
      if (range.to) q.set("to", range.to);
      await downloadFile(`/api/export?${q}`, `relatorio.${format}`);
      toast.success("Arquivo gerado", format === "xlsx" ? "Relatório completo em Excel." : "Operações em CSV.");
    } catch (err) {
      toast.error("Falha na exportação", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  const s = report.summary;
  const rows: [string, React.ReactNode][] = [
    ["Operações", formatNumber(s.count)],
    ["WIN / LOSS / Empates", `${s.wins} / ${s.losses} / ${s.draws}`],
    ["Taxa de acerto", formatPct(s.winRate)],
    ["Lucro bruto", <MoneyText key="gp" cents={s.grossProfitCents} currency={cur} />],
    ["Prejuízo bruto", <MoneyText key="gl" cents={-s.grossLossCents} currency={cur} />],
    ["Resultado líquido", <MoneyText key="n" cents={s.netCents} currency={cur} className="font-semibold" />],
    ["Lucro médio por WIN", s.avgWinCents === null ? "—" : formatMoney(Math.round(s.avgWinCents), cur)],
    ["Perda média por LOSS", s.avgLossCents === null ? "—" : formatMoney(-Math.round(s.avgLossCents), cur)],
    ["Melhor operação", s.best ? <MoneyText key="b" cents={s.best.profitCents} currency={cur} /> : "—"],
    ["Pior operação", s.worst ? <MoneyText key="w" cents={s.worst.profitCents} currency={cur} /> : "—"],
    ["Fator de lucro", s.profitFactor === null ? "—" : s.profitFactor.toFixed(2).replace(".", ",")],
    ["Total investido", formatMoney(s.totalStakeCents, cur)],
    ["Retorno sobre investido", formatPct(s.returnOnStakePct, { signed: true, digits: 2 })],
    ["Saldo atual da conta", formatMoney(p.balanceCents, cur)],
  ];

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Gere relatórios por período, exporte em CSV ou Excel e imprima/salve em PDF."
        actions={
          <>
            <PeriodPicker value={period} onChange={setPeriod} testId="report-period" />
            <Button variant="secondary" icon={<FileText className="size-4" />} onClick={() => exportFile("csv")} loading={busy === "csv"} data-testid="export-csv">
              CSV
            </Button>
            <Button variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => exportFile("xlsx")} loading={busy === "xlsx"} data-testid="export-xlsx">
              Excel
            </Button>
            <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
          </>
        }
      />

      <div className="print-text-dark grid gap-4">
        <Panel title={`Relatório de desempenho — ${periodLabel(period)}`} subtitle={`${user?.name ?? ""} · gerado em ${formatDateTime(new Date().toISOString(), p.tz)} · fuso ${settings.timezone}`}>
          {s.count === 0 ? (
            <EmptyState title="Sem operações no período" description="Escolha outro período ou registre operações." />
          ) : (
            <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3" data-testid="report-summary">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 border-b border-line/70 py-2.5 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num text-right text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>

        {s.count > 0 && (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Por ativo">
                <BucketTable buckets={report.assets} nameOf={(k) => k} currency={cur} label="Ativo" />
              </Panel>
              <Panel title="Por estratégia">
                <BucketTable buckets={report.strategies} nameOf={strategyName} currency={cur} label="Estratégia" />
              </Panel>
            </div>
            <Panel title="Resultado por dia">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="text-left text-muted">
                    <tr className="border-b border-line">
                      <th className="py-2 pr-3 font-medium">Data</th>
                      <th className="px-3 py-2 text-right font-medium">Op.</th>
                      <th className="px-3 py-2 text-right font-medium">W / L</th>
                      <th className="px-3 py-2 text-right font-medium">Acerto</th>
                      <th className="px-3 py-2 text-right font-medium">Rentab. do dia</th>
                      <th className="py-2 pl-3 text-right font-medium">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.days.map((d) => (
                      <tr key={d.key} className="border-b border-line/60 last:border-0">
                        <td className="num py-2 pr-3">{formatDayKey(d.key)}</td>
                        <td className="num px-3 py-2 text-right">{d.count}</td>
                        <td className="num px-3 py-2 text-right">
                          <span className="text-pos">{d.wins}</span> / <span className="text-neg">{d.losses}</span>
                        </td>
                        <td className="num px-3 py-2 text-right">{formatPct(d.winRate)}</td>
                        <td className="num px-3 py-2 text-right">{formatPct(d.returnPct, { signed: true, digits: 2 })}</td>
                        <td className="py-2 pl-3 text-right font-medium">
                          <MoneyText cents={d.netCents} currency={cur} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        <Panel title="Movimentações de capital no período">
          {report.cash.length === 0 ? (
            <p className="text-sm text-muted">Nenhum depósito ou retirada no período.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {report.cash.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-muted">
                    {formatDateTime(c.occurredAt, p.tz)} · {c.type === "DEPOSIT" ? "Depósito" : "Retirada"}
                    {c.note && ` · ${c.note}`}
                  </span>
                  <MoneyText cents={c.type === "DEPOSIT" ? c.amountCents : -c.amountCents} currency={cur} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

export function ReportsView() {
  return (
    <DataGate>
      <ReportsContent />
    </DataGate>
  );
}
