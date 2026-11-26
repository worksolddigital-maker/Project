"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  EquityChart,
  PnlBarChart,
  RankBarChart,
  WinLossDonut,
  WinRateChart,
} from "@/components/charts/charts";
import { DataGate, PageHeader } from "@/components/layout/page";
import { motion } from "motion/react";
import { EmptyState, Panel, Segmented, Tabs } from "@/components/ui/misc";
import {
  PeriodPicker,
  periodLabel,
  rangeOf,
  type PeriodValue,
} from "@/components/ui/period-picker";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import {
  dailySeries,
  equitySeries,
  hourlySeries,
  monthlySeries,
  weeklySeries,
  winRateSeries,
} from "@/features/analytics/series";
import { useReadyData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import {
  comparePeriods,
  filterByRange,
  groupByAsset,
  groupByHour,
  groupByStrategy,
  summarize,
  weekdayHourMatrix,
  type ComparisonRow,
} from "@/lib/domain/analytics";
import { formatMoney, formatNumber, formatPct } from "@/lib/domain/money";
import type { Currency } from "@/lib/domain/types";
import { BucketTable } from "./bucket-table";
import { WeekdayHourHeatmap } from "./heatmap";

function formatComparison(
  v: number | null,
  format: ComparisonRow["format"],
  cur: Currency,
  signed = false,
) {
  if (v === null) return "—";
  switch (format) {
    case "money":
      return formatMoney(Math.round(v), cur, { signed });
    case "pct":
      return signed
        ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(Number(v.toFixed(1))))} p.p.`
        : formatPct(v);
    case "ratio":
      return `${signed && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2).replace(".", ",")}`;
    default:
      return `${signed && v > 0 ? "+" : ""}${formatNumber(v)}`;
  }
}

function Comparison() {
  const { portfolio: p, settings } = useReadyData();
  const [a, setA] = useState<PeriodValue>({
    preset: "lastMonth",
    from: "",
    to: "",
  });
  const [b, setB] = useState<PeriodValue>({
    preset: "thisMonth",
    from: "",
    to: "",
  });
  const rows = useMemo(() => {
    const sa = summarize(
      filterByRange(p.sortedTrades, rangeOf(a, p.today), p.tz),
    );
    const sb = summarize(
      filterByRange(p.sortedTrades, rangeOf(b, p.today), p.tz),
    );
    return comparePeriods(sa, sb);
  }, [a, b, p]);
  const cur = settings.currency;

  return (
    <Panel
      className="xl:col-span-3"
      title="Comparação entre períodos"
      subtitle="Diferença = período B − período A"
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-line text-[11px] text-muted">
            A
          </span>
          <PeriodPicker value={a} onChange={setA} label="Período A" />
        </div>
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-line-strong text-[11px] text-fg">
            B
          </span>
          <PeriodPicker value={b} onChange={setB} label="Período B" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[560px] text-[13px]"
          data-testid="comparison-table"
        >
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="py-2.5 pr-3 font-medium">Indicador</th>
              <th className="px-3 py-2.5 text-right font-medium">
                A · {periodLabel(a)}
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                B · {periodLabel(b)}
              </th>
              <th className="py-2.5 pl-3 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const good =
                r.delta === null || r.delta === 0
                  ? null
                  : r.higherIsBetter
                    ? r.delta > 0
                    : r.delta < 0;
              const Icon =
                good === null
                  ? Minus
                  : r.delta! > 0
                    ? ArrowUpRight
                    : ArrowDownRight;
              return (
                <tr
                  key={r.key}
                  className="border-b border-line/60 last:border-0"
                >
                  <td className="py-2.5 pr-3 text-muted">{r.label}</td>
                  <td className="num px-3 py-2.5 text-right">
                    {formatComparison(r.a, r.format, cur)}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-fg">
                    {formatComparison(r.b, r.format, cur)}
                  </td>
                  <td
                    className={cn(
                      "num py-2.5 pl-3 text-right",
                      good === null
                        ? "text-muted"
                        : good
                          ? "text-pos"
                          : "text-neg",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Icon className="size-3.5" />
                      {formatComparison(r.delta, r.format, cur, true)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

type Section = "desempenho" | "ativos" | "horarios" | "comparacao";
const SECTIONS: { value: Section; label: string }[] = [
  { value: "desempenho", label: "Desempenho" },
  { value: "ativos", label: "Ativos e estratégias" },
  { value: "horarios", label: "Horários" },
  { value: "comparacao", label: "Comparação" },
];

function StatsContent() {
  const [section, setSection] = useState<Section>("desempenho");
  const { portfolio: p, settings, strategyName } = useReadyData();
  const cur = settings.currency;
  const [period, setPeriod] = useState<PeriodValue>({
    preset: "all",
    from: "",
    to: "",
  });
  const [bucketView, setBucketView] = useState<"asset" | "strategy">("asset");
  const range = rangeOf(period, p.today);

  const data = useMemo(() => {
    const trades = filterByRange(p.sortedTrades, range, p.tz);
    const hours = groupByHour(trades, p.tz).filter((h) => h.count > 0);
    const bestHour = hours.length
      ? hours.reduce((a, b) => (b.netCents > a.netCents ? b : a))
      : null;
    const worstHour = hours.length
      ? hours.reduce((a, b) => (b.netCents < a.netCents ? b : a))
      : null;
    return {
      trades,
      summary: summarize(trades),
      equity: equitySeries(p, range),
      daily: dailySeries(trades, p, range),
      weekly: weeklySeries(trades, p.tz),
      monthly: monthlySeries(trades, p.tz),
      winRate: winRateSeries(trades, p.tz),
      hourly: hourlySeries(trades, p.tz),
      heat: weekdayHourMatrix(trades, p.tz),
      assets: groupByAsset(trades),
      strategies: groupByStrategy(trades),
      bestHour,
      worstHour,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, range.from, range.to]);

  const s = data.summary;
  const signed = (v: number) =>
    formatMoney(Math.round(v), cur, { signed: true });
  const buckets = bucketView === "asset" ? data.assets : data.strategies;
  const nameOf = bucketView === "asset" ? (k: string) => k : strategyName;

  return (
    <>
      <PageHeader
        title="Estatísticas"
        description="Análise de desempenho com dados reais das suas operações. Passe o mouse sobre os gráficos para ver detalhes."
        actions={
          <PeriodPicker
            value={period}
            onChange={setPeriod}
            testId="stats-period"
          />
        }
      />

      {p.summary.count === 0 ? (
        <Panel>
          <EmptyState
            title="Sem dados para analisar"
            description="As estatísticas aparecem assim que você registrar ou importar operações."
          />
        </Panel>
      ) : (
        <>
          <StatGrid className="lg:grid-cols-3 min-[1760px]:grid-cols-6">
            <StatCard
              label="Resultado no período"
              value={s.netCents}
              format={signed}
              tone={s.netCents > 0 ? "pos" : s.netCents < 0 ? "neg" : "neutral"}
              testId="stats-net"
            />
            <StatCard
              label="Operações"
              value={s.count}
              format={(v) => formatNumber(Math.round(v))}
              sub={`${s.wins} W · ${s.losses} L · ${s.draws} E`}
            />
            <StatCard
              label="Taxa de acerto"
              value={s.winRate}
              format={(v) => formatPct(v)}
            />
            <StatCard
              label="Fator de lucro"
              value={s.profitFactor}
              format={(v) => v.toFixed(2).replace(".", ",")}
              tone={
                s.profitFactor === null
                  ? "neutral"
                  : s.profitFactor >= 1
                    ? "pos"
                    : "neg"
              }
            />
            <StatCard
              label="Resultado médio / operação"
              value={s.expectancyCents}
              format={signed}
              tone={
                s.expectancyCents && s.expectancyCents > 0
                  ? "pos"
                  : s.expectancyCents && s.expectancyCents < 0
                    ? "neg"
                    : "neutral"
              }
            />
            <StatCard
              label="Retorno sobre investido"
              value={s.returnOnStakePct}
              format={(v) => formatPct(v, { signed: true, digits: 2 })}
              tone={
                s.returnOnStakePct && s.returnOnStakePct > 0
                  ? "pos"
                  : s.returnOnStakePct && s.returnOnStakePct < 0
                    ? "neg"
                    : "neutral"
              }
            />
          </StatGrid>

          <Tabs<Section>
            className="mt-6 mb-4"
            value={section}
            onChange={setSection}
            tabs={SECTIONS}
          />
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-4 xl:grid-cols-3"
            data-testid={`stats-section-${section}`}
          >
            {section === "desempenho" && (
              <>
                <Panel
                  className="xl:col-span-2"
                  title="Evolução do saldo"
                  subtitle={periodLabel(period)}
                >
                  <EquityChart data={data.equity} currency={cur} />
                </Panel>
                <Panel title="Distribuição de WIN e LOSS">
                  <WinLossDonut
                    wins={s.wins}
                    losses={s.losses}
                    draws={s.draws}
                  />
                </Panel>

                <Panel
                  className="xl:col-span-3"
                  title="Lucro e prejuízo diário"
                >
                  <PnlBarChart data={data.daily} currency={cur} />
                </Panel>

                <Panel
                  className="xl:col-span-2"
                  title="Desempenho semanal"
                  subtitle="Semanas de segunda a domingo"
                >
                  <PnlBarChart data={data.weekly} currency={cur} height={240} />
                </Panel>
                <Panel title="Desempenho mensal">
                  <PnlBarChart
                    data={data.monthly}
                    currency={cur}
                    height={240}
                  />
                </Panel>

                <Panel
                  className="xl:col-span-3"
                  title="Taxa de acerto ao longo do tempo"
                >
                  <WinRateChart data={data.winRate} />
                </Panel>
              </>
            )}
            {section === "ativos" && (
              <>
                <Panel
                  className="xl:col-span-3"
                  title={
                    bucketView === "asset"
                      ? "Desempenho por ativo"
                      : "Desempenho por estratégia"
                  }
                  actions={
                    <Segmented
                      size="sm"
                      value={bucketView}
                      onChange={setBucketView}
                      ariaLabel="Agrupar por"
                      options={[
                        { value: "asset", label: "Ativo" },
                        { value: "strategy", label: "Estratégia" },
                      ]}
                    />
                  }
                >
                  <RankBarChart
                    data={buckets.map((b) => ({
                      name: nameOf(b.key),
                      net: b.netCents,
                      count: b.count,
                      winRate: b.winRate,
                    }))}
                    currency={cur}
                  />
                  <BucketTable
                    buckets={buckets}
                    nameOf={nameOf}
                    currency={cur}
                    label={bucketView === "asset" ? "Ativo" : "Estratégia"}
                  />
                </Panel>
              </>
            )}
            {section === "horarios" && (
              <>
                <Panel
                  title="Horários de maior rentabilidade"
                  subtitle={`Horário de ${settings.timezone.replace("_", " ")}`}
                >
                  <PnlBarChart data={data.hourly} currency={cur} height={220} />
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-muted">Melhor faixa</p>
                      <p className="num mt-1 text-sm font-semibold text-fg">
                        {data.bestHour
                          ? `${data.bestHour.key.padStart(2, "0")}h`
                          : "—"}
                      </p>
                      {data.bestHour && (
                        <p
                          className={cn(
                            "num",
                            data.bestHour.netCents >= 0
                              ? "text-pos"
                              : "text-neg",
                          )}
                        >
                          {signed(data.bestHour.netCents)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-muted">Pior faixa</p>
                      <p className="num mt-1 text-sm font-semibold text-fg">
                        {data.worstHour
                          ? `${data.worstHour.key.padStart(2, "0")}h`
                          : "—"}
                      </p>
                      {data.worstHour && (
                        <p
                          className={cn(
                            "num",
                            data.worstHour.netCents >= 0
                              ? "text-pos"
                              : "text-neg",
                          )}
                        >
                          {signed(data.worstHour.netCents)}
                        </p>
                      )}
                    </div>
                  </div>
                </Panel>

                <Panel
                  className="xl:col-span-3"
                  title="Mapa de calor: dia da semana × horário"
                  subtitle="Resultado líquido por faixa horária"
                >
                  <WeekdayHourHeatmap matrix={data.heat} currency={cur} />
                </Panel>
              </>
            )}
            {section === "comparacao" && <Comparison />}
          </motion.div>
        </>
      )}
    </>
  );
}

export function StatsView() {
  return (
    <DataGate>
      <StatsContent />
    </DataGate>
  );
}
