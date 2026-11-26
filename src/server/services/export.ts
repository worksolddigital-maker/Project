import "server-only";
import {
  buildLedger,
  filterByRange,
  groupByAsset,
  groupByDay,
  groupByStrategy,
  NO_STRATEGY_KEY,
  sortTrades,
  summarize,
} from "@/lib/domain/analytics";
import { dayKeyOf, formatDayKey, inRange, wallTimeOf, type DateRange } from "@/lib/domain/dates";
import { IMPORT_TEMPLATE_HEADERS } from "@/lib/domain/import-mapping";
import { centsToInput, currencySymbol } from "@/lib/domain/money";
import { formatExpiration, returnPct } from "@/lib/domain/trade-calc";
import {
  EMOTION_LABELS,
  PLAN_ADHERENCE_LABELS,
  RESULT_LABELS,
  type CashMovement,
  type JournalEntry,
  type Strategy,
  type Trade,
  type UserSettings,
} from "@/lib/domain/types";

export interface ExportData {
  trades: Trade[];
  cash: CashMovement[];
  strategies: Strategy[];
  journal: JournalEntry[];
  settings: UserSettings;
  userName: string;
}

/** Prevents CSV/spreadsheet formula injection in free-text cells. */
function safeText(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function csvCell(v: string): string {
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Expiration in a re-importable compact form ("30s", "5m"). */
function expirationToken(seconds: number): string {
  return seconds % 60 === 0 ? `${seconds / 60}m` : `${seconds}s`;
}

const decimal = (v: number, digits = 2) => v.toFixed(digits).replace(".", ",");

/** CSV compatible with Excel pt-BR (";" separator, UTF-8 BOM) and re-importable by the system. */
export function buildTradesCsv(data: ExportData, range: DateRange): string {
  const tz = data.settings.timezone;
  const names = new Map(data.strategies.map((s) => [s.id, s.name]));
  const rows = sortTrades(filterByRange(data.trades, range, tz));
  const header = [...IMPORT_TEMPLATE_HEADERS, "retorno_pct"];
  const lines = [header.join(";")];
  for (const t of rows) {
    lines.push(
      [
        formatDayKey(dayKeyOf(t.executedAt, tz)),
        wallTimeOf(t.executedAt, tz),
        safeText(t.asset),
        t.direction,
        centsToInput(t.stakeCents),
        expirationToken(t.expirationSeconds),
        RESULT_LABELS[t.result],
        t.payoutPct === null ? "" : decimal(t.payoutPct),
        centsToInput(t.profitCents),
        safeText(t.strategyId ? names.get(t.strategyId) ?? "" : ""),
        safeText(t.notes.replace(/\r?\n/g, " ")),
        decimal(returnPct(t.profitCents, t.stakeCents)),
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function templateCsv(): string {
  const example = ["25/11/2026", "14:30:00", "EUR/USD", "CALL", "50,00", "1m", "WIN", "87,00", "", "Minha estratégia", "Exemplo — apague esta linha"];
  return "﻿" + [IMPORT_TEMPLATE_HEADERS.join(";"), example.join(";")].join("\r\n") + "\r\n";
}

export async function buildWorkbook(data: ExportData, range: DateRange, periodLabel: string): Promise<Buffer> {
  const { default: ExcelJS } = await import("exceljs");
  const tz = data.settings.timezone;
  const cur = data.settings.currency;
  const sym = currencySymbol(cur);
  const moneyFmt = `"${sym}" #,##0.00;[Red]-"${sym}" #,##0.00`;
  const pctFmt = '0.00"%";[Red]-0.00"%"';
  const names = new Map(data.strategies.map((s) => [s.id, s.name]));
  const all = sortTrades(data.trades);
  const ledger = buildLedger(all, data.cash, data.settings.initialCapitalCents, tz);
  const trades = filterByRange(all, range, tz);
  const summary = summarize(trades);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Trading Desk";
  wb.created = new Date();

  const styleHeader = (ws: import("exceljs").Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    row.alignment = { vertical: "middle" };
    row.height = 20;
    ws.views = [{ state: "frozen", ySplit: 1 }];
    if (ws.columnCount > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  };

  // Summary
  const resumo = wb.addWorksheet("Resumo");
  resumo.columns = [
    { header: "Indicador", key: "k", width: 38 },
    { header: "Valor", key: "v", width: 24 },
  ];
  const add = (k: string, v: number | string | null, fmt?: string) => {
    const r = resumo.addRow({ k, v: v ?? "—" });
    if (fmt && typeof v === "number") r.getCell(2).numFmt = fmt;
  };
  add("Titular", data.userName);
  add("Período", periodLabel);
  add("Gerado em", new Date().toLocaleString("pt-BR", { timeZone: tz }));
  add("Capital inicial", data.settings.initialCapitalCents / 100, moneyFmt);
  add("Depósitos (total)", ledger.depositsCents / 100, moneyFmt);
  add("Retiradas (total)", ledger.withdrawalsCents / 100, moneyFmt);
  add("Saldo atual", ledger.balanceCents / 100, moneyFmt);
  add("Operações no período", summary.count);
  add("WIN", summary.wins);
  add("LOSS", summary.losses);
  add("Empates", summary.draws);
  add("Taxa de acerto (%)", summary.winRate, pctFmt);
  add("Lucro bruto", summary.grossProfitCents / 100, moneyFmt);
  add("Prejuízo bruto", -summary.grossLossCents / 100, moneyFmt);
  add("Resultado líquido", summary.netCents / 100, moneyFmt);
  add("Lucro médio por WIN", summary.avgWinCents === null ? null : summary.avgWinCents / 100, moneyFmt);
  add("Perda média por LOSS", summary.avgLossCents === null ? null : -summary.avgLossCents / 100, moneyFmt);
  add("Resultado médio por operação", summary.expectancyCents === null ? null : summary.expectancyCents / 100, moneyFmt);
  add("Melhor operação", summary.best ? summary.best.profitCents / 100 : null, moneyFmt);
  add("Pior operação", summary.worst ? summary.worst.profitCents / 100 : null, moneyFmt);
  add("Fator de lucro", summary.profitFactor === null ? null : Number(summary.profitFactor.toFixed(2)));
  add("Total investido", summary.totalStakeCents / 100, moneyFmt);
  add("Drawdown máximo (histórico)", -ledger.drawdown.maxCents / 100, moneyFmt);
  styleHeader(resumo);

  // Trades
  const ops = wb.addWorksheet("Operações");
  ops.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Hora", key: "time", width: 10 },
    { header: "Ativo", key: "asset", width: 16 },
    { header: "Tipo", key: "dir", width: 8 },
    { header: "Valor investido", key: "stake", width: 16, style: { numFmt: moneyFmt } },
    { header: "Expiração", key: "exp", width: 12 },
    { header: "Resultado", key: "res", width: 11 },
    { header: "Payout (%)", key: "payout", width: 11 },
    { header: "Lucro/Prejuízo", key: "profit", width: 16, style: { numFmt: moneyFmt } },
    { header: "Retorno (%)", key: "ret", width: 12, style: { numFmt: pctFmt } },
    { header: "Estratégia", key: "strategy", width: 22 },
    { header: "Observações", key: "notes", width: 40 },
  ];
  for (const t of trades) {
    ops.addRow({
      date: formatDayKey(dayKeyOf(t.executedAt, tz)),
      time: wallTimeOf(t.executedAt, tz),
      asset: safeText(t.asset),
      dir: t.direction,
      stake: t.stakeCents / 100,
      exp: formatExpiration(t.expirationSeconds),
      res: RESULT_LABELS[t.result],
      payout: t.payoutPct,
      profit: t.profitCents / 100,
      ret: Number(returnPct(t.profitCents, t.stakeCents).toFixed(2)),
      strategy: safeText(t.strategyId ? names.get(t.strategyId) ?? "" : ""),
      notes: safeText(t.notes),
    });
  }
  styleHeader(ops);

  // Per day
  const daysWs = wb.addWorksheet("Por dia");
  daysWs.columns = [
    { header: "Data", key: "d", width: 12 },
    { header: "Operações", key: "c", width: 11 },
    { header: "WIN", key: "w", width: 7 },
    { header: "LOSS", key: "l", width: 7 },
    { header: "Empates", key: "e", width: 9 },
    { header: "Taxa de acerto (%)", key: "wr", width: 17, style: { numFmt: '0.0"%"' } },
    { header: "Resultado", key: "n", width: 15, style: { numFmt: moneyFmt } },
    { header: "Rentabilidade do dia (%)", key: "r", width: 22, style: { numFmt: pctFmt } },
  ];
  const days = groupByDay(trades, tz, ledger.dayStartBalance);
  for (const d of [...days.values()].sort((a, b) => (a.key < b.key ? -1 : 1))) {
    daysWs.addRow({
      d: formatDayKey(d.key),
      c: d.count,
      w: d.wins,
      l: d.losses,
      e: d.draws,
      wr: d.winRate === null ? null : Number(d.winRate.toFixed(1)),
      n: d.netCents / 100,
      r: d.returnPct === null ? null : Number(d.returnPct.toFixed(2)),
    });
  }
  styleHeader(daysWs);

  const bucketSheet = (title: string, label: string, buckets: ReturnType<typeof groupByAsset>, nameOf: (k: string) => string) => {
    const ws = wb.addWorksheet(title);
    ws.columns = [
      { header: label, key: "k", width: 24 },
      { header: "Operações", key: "c", width: 11 },
      { header: "WIN", key: "w", width: 7 },
      { header: "LOSS", key: "l", width: 7 },
      { header: "Taxa de acerto (%)", key: "wr", width: 17, style: { numFmt: '0.0"%"' } },
      { header: "Resultado", key: "n", width: 15, style: { numFmt: moneyFmt } },
      { header: "Total investido", key: "s", width: 16, style: { numFmt: moneyFmt } },
    ];
    for (const b of buckets) {
      ws.addRow({
        k: safeText(nameOf(b.key)),
        c: b.count,
        w: b.wins,
        l: b.losses,
        wr: b.winRate === null ? null : Number(b.winRate.toFixed(1)),
        n: b.netCents / 100,
        s: b.stakeCents / 100,
      });
    }
    styleHeader(ws);
  };
  bucketSheet("Por ativo", "Ativo", groupByAsset(trades), (k) => k);
  bucketSheet("Por estratégia", "Estratégia", groupByStrategy(trades), (k) =>
    k === NO_STRATEGY_KEY ? "Sem estratégia" : names.get(k) ?? "Removida",
  );

  // Cash movements
  const cashWs = wb.addWorksheet("Movimentações");
  cashWs.columns = [
    { header: "Data", key: "d", width: 18 },
    { header: "Tipo", key: "t", width: 12 },
    { header: "Valor", key: "v", width: 15, style: { numFmt: moneyFmt } },
    { header: "Observação", key: "n", width: 40 },
  ];
  for (const c of [...data.cash].sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1))) {
    if (!inRange(dayKeyOf(c.occurredAt, tz), range)) continue;
    cashWs.addRow({
      d: `${formatDayKey(dayKeyOf(c.occurredAt, tz))} ${wallTimeOf(c.occurredAt, tz).slice(0, 5)}`,
      t: c.type === "DEPOSIT" ? "Depósito" : "Retirada",
      v: (c.type === "DEPOSIT" ? c.amountCents : -c.amountCents) / 100,
      n: safeText(c.note),
    });
  }
  styleHeader(cashWs);

  // Journal
  const jWs = wb.addWorksheet("Diário de trading");
  jWs.columns = [
    { header: "Sessão", key: "d", width: 12 },
    { header: "Emocional", key: "e", width: 14 },
    { header: "Estratégia", key: "s", width: 20 },
    { header: "Seguiu o gerenciamento", key: "f", width: 22 },
    { header: "Operou por impulso", key: "i", width: 18 },
    { header: "Principal erro", key: "m", width: 40 },
    { header: "O que fez corretamente", key: "r", width: 40 },
    { header: "O que precisa melhorar", key: "t", width: 40 },
  ];
  for (const j of [...data.journal].sort((a, b) => (a.sessionDate < b.sessionDate ? -1 : 1))) {
    if (!inRange(j.sessionDate, range)) continue;
    jWs.addRow({
      d: formatDayKey(j.sessionDate),
      e: EMOTION_LABELS[j.emotion],
      s: j.strategyId ? names.get(j.strategyId) ?? "" : "",
      f: PLAN_ADHERENCE_LABELS[j.followedPlan],
      i: j.impulsive ? "Sim" : "Não",
      m: safeText(j.mainMistake),
      r: safeText(j.didRight),
      t: safeText(j.toImprove),
    });
  }
  styleHeader(jWs);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

export async function templateWorkbook(): Promise<Buffer> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Operações");
  ws.addRow(IMPORT_TEMPLATE_HEADERS);
  ws.addRow(["25/11/2026", "14:30:00", "EUR/USD", "CALL", "50,00", "1m", "WIN", "87", "", "Minha estratégia", "Exemplo — apague esta linha"]);
  ws.columns.forEach((c) => (c.width = 16));
  ws.getRow(1).font = { bold: true };
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
