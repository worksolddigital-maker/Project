import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import { normalizeRow, suggestMapping } from "@/lib/domain/import-mapping";
import { getDb, type Db } from "@/server/db/client";
import { ApiError } from "@/server/http";
import { listEvents } from "@/server/repositories/audit";
import { createCash, createJournal, createStrategy, getSettings, listCash, listJournal, listStrategies, updateSettings } from "@/server/repositories/entities";
import { createTrade, deleteTrade, listTrades, updateTrade } from "@/server/repositories/trades";
import { assertPassword, authenticate, changePassword, registerUser } from "@/server/repositories/users";
import { exportBackup, restoreBackup } from "@/server/services/backup";
import { buildTradesCsv, buildWorkbook } from "@/lib/reports/export-builders";
import { commitImport, parseImportFile } from "@/server/services/import";

const TZ = "America/Sao_Paulo";
let db: Db;
let alice: string;
let bob: string;

const base = {
  executedAt: "2026-11-02T13:00:00.000Z",
  asset: "eur/usd",
  direction: "CALL" as const,
  stakeCents: 5000,
  expirationSeconds: 60,
  result: "WIN" as const,
  payoutPct: 87,
  profitIsManual: false,
  profitCents: null,
  strategyId: null,
  notes: "",
};

beforeAll(async () => {
  db = await getDb();
  alice = (await registerUser(db, { name: "Alice", email: "alice@test.dev", password: "SenhaForte123", timezone: TZ })).id;
  bob = (await registerUser(db, { name: "Bob", email: "bob@test.dev", password: "SenhaForte123", timezone: TZ })).id;
});

describe("users and auth", () => {
  it("rejects duplicate e-mails (case-insensitive) and checks passwords", async () => {
    await expect(registerUser(db, { name: "X", email: "ALICE@test.dev", password: "SenhaForte123" })).rejects.toBeInstanceOf(ApiError);
    expect((await authenticate(db, "alice@test.dev", "SenhaForte123")).id).toBe(alice);
    await expect(authenticate(db, "alice@test.dev", "Errada12345")).rejects.toMatchObject({ status: 401, message: "E-mail ou senha incorretos." });
    await expect(authenticate(db, "ninguem@test.dev", "SenhaForte123")).rejects.toMatchObject({ status: 401, message: "E-mail ou senha incorretos." });
  });

  it("refuses passwords that contain the person's name", async () => {
    await expect(registerUser(db, { name: "Carla Mendes", email: "carla@test.dev", password: "MENDES2026abc" })).rejects.toMatchObject({ status: 422 });
    const id = (await registerUser(db, { name: "Carla Mendes", email: "carla@test.dev", password: "Painel2026ok" })).id;
    await expect(changePassword(db, id, "Painel2026ok", "CarlaNova2026")).rejects.toMatchObject({ status: 422 });
  });

  it("locks the account after repeated wrong passwords and logs every attempt", async () => {
    const id = (await registerUser(db, { name: "Dora", email: "dora@test.dev", password: "Painel2026ok" })).id;
    for (let i = 1; i < 5; i++) {
      await expect(authenticate(db, "dora@test.dev", "Errada12345", "10.0.0.9")).rejects.toMatchObject({ status: 401 });
    }
    await expect(authenticate(db, "dora@test.dev", "Errada12345", "10.0.0.9")).rejects.toMatchObject({ status: 423 });
    // While locked, even the right password is refused.
    await expect(authenticate(db, "dora@test.dev", "Painel2026ok")).rejects.toMatchObject({ status: 423 });

    const security = await listEvents(db, id, "security");
    expect(security.filter((e) => e.action === "auth.login_failed")).toHaveLength(4);
    expect(security[0]).toMatchObject({ action: "auth.locked", ip: "10.0.0.9" });
    expect(JSON.parse(security[0].detail)).toEqual({ attempts: 5 });
    expect(security.at(-1)?.action).toBe("auth.register");
    // Security events never show up in the activity log.
    expect(await listEvents(db, id, "activity")).toHaveLength(0);
  });

  it("resets the failure counter after a successful sign-in", async () => {
    const id = (await registerUser(db, { name: "Enzo", email: "enzo@test.dev", password: "Painel2026ok" })).id;
    for (let i = 0; i < 4; i++) await expect(authenticate(db, "enzo@test.dev", "Errada12345")).rejects.toMatchObject({ status: 401 });
    const user = await authenticate(db, "enzo@test.dev", "Painel2026ok");
    expect(user.lastLoginAt).not.toBeNull();
    // Four more wrong attempts do not lock, because the counter started over.
    for (let i = 0; i < 4; i++) await expect(authenticate(db, "enzo@test.dev", "Errada12345")).rejects.toMatchObject({ status: 401 });
    expect((await authenticate(db, "enzo@test.dev", "Painel2026ok")).id).toBe(id);
  });

  it("re-authenticates sensitive actions with the current password", async () => {
    await expect(assertPassword(db, alice, "SenhaForte123")).resolves.toBeUndefined();
    await expect(assertPassword(db, alice, "outra")).rejects.toMatchObject({ status: 422, fields: { password: "Senha incorreta." } });
  });
});

describe("trades repository", () => {
  it("computes profit server-side, normalizes asset and scopes by user", async () => {
    const t = await createTrade(db, alice, base);
    expect(t.asset).toBe("EUR/USD");
    expect(t.profitCents).toBe(4350);
    const updated = await updateTrade(db, alice, t.id, { ...base, result: "LOSS" });
    expect(updated.profitCents).toBe(-5000);
    await expect(updateTrade(db, bob, t.id, base)).rejects.toMatchObject({ status: 404 });
    await expect(deleteTrade(db, bob, t.id)).rejects.toMatchObject({ status: 404 });
    await deleteTrade(db, alice, t.id);
    expect(await listTrades(db, alice)).toHaveLength(0);
  });

  it("refuses strategies from another user", async () => {
    const s = await createStrategy(db, bob, { name: "Do Bob", description: "" });
    await expect(createTrade(db, alice, { ...base, strategyId: s.id })).rejects.toMatchObject({ status: 422 });
  });
});

describe("Excel import", () => {
  it("parses real Excel dates/numbers and imports with strategies", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Histórico");
    ws.addRow(["Data/Hora", "Ativo", "Direção", "Investimento", "Duração", "Status", "Lucro", "Estratégia"]);
    ws.addRow([new Date(Date.UTC(2026, 10, 3, 14, 5, 0)), "EUR/USD", "Compra", 25.5, "M1", "Ganho", 21.93, "Fluxo"]);
    ws.addRow([new Date(Date.UTC(2026, 10, 3, 14, 10, 0)), "GBP/USD", "Venda", 30, "M5", "Perda", -30, "fluxo"]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const sheet = await parseImportFile(new File([buffer], "hist.xlsx"));
    expect(sheet.headers[0]).toBe("Data/Hora");
    expect(sheet.rows[0][0]).toBe("2026-11-03 14:05:00");
    expect(sheet.rows[0][3]).toBe("25,5");

    const mapping = suggestMapping(sheet.headers);
    const rows = sheet.rows.map((r) => normalizeRow(r, mapping, { timezone: TZ, fallbackPayoutPct: null, fallbackExpirationSeconds: null }));
    expect(rows.every((r) => r.ok)).toBe(true);
    const trades = rows.flatMap((r) => (r.ok ? [r.trade] : []));
    expect(trades[0]).toMatchObject({ executedAt: "2026-11-03T17:05:00.000Z", stakeCents: 2550, profitCents: 2193, result: "WIN", direction: "CALL", expirationSeconds: 60 });

    const res = await commitImport(db, alice, trades, true);
    expect(res).toEqual({ inserted: 2, duplicates: 0, strategiesCreated: 1 });
    const again = await commitImport(db, alice, trades, true);
    expect(again).toMatchObject({ inserted: 0, duplicates: 2 });
    const strategies = await listStrategies(db, alice);
    expect(strategies.map((s) => s.name)).toEqual(["Fluxo"]);
  });
});

describe("export round-trip", () => {
  it("re-imports its own CSV export without loss", async () => {
    const [settings, trades, cash, strategies, journal] = await Promise.all([
      getSettings(db, alice),
      listTrades(db, alice),
      listCash(db, alice),
      listStrategies(db, alice),
      listJournal(db, alice),
    ]);
    const data = { settings, trades, cash, strategies, journal, userName: "Alice" };
    const csv = buildTradesCsv(data, { from: null, to: null });
    const parsed = await parseImportFile(new File([csv], "export.csv"));
    const mapping = suggestMapping(parsed.headers);
    const back = parsed.rows.map((r) => normalizeRow(r, mapping, { timezone: settings.timezone, fallbackPayoutPct: null, fallbackExpirationSeconds: null }));
    expect(back.every((r) => r.ok)).toBe(true);
    const res = await commitImport(db, alice, back.flatMap((r) => (r.ok ? [r.trade] : [])), true);
    expect(res.duplicates).toBe(trades.length);

    const xlsx = await buildWorkbook(data, { from: null, to: null }, "Tudo");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsx as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Resumo", "Operações", "Por dia", "Por ativo", "Por estratégia", "Movimentações", "Diário de trading"]);
    expect(wb.getWorksheet("Operações")!.rowCount).toBe(trades.length + 1);
    const resumo = wb.getWorksheet("Resumo")!;
    const netRow = resumo.getColumn(1).values.findIndex((v) => v === "Resultado líquido");
    expect(resumo.getRow(netRow).getCell(2).value).toBeCloseTo((2193 - 3000) / 100);
  });
});

describe("backup", () => {
  it("restores into another account with remapped ids", async () => {
    await updateSettings(db, alice, { initialCapitalCents: 100000, dailyLossLimitCents: 5000 });
    await createCash(db, alice, { type: "DEPOSIT", amountCents: 20000, occurredAt: "2026-11-01T12:00:00.000Z", note: "" });
    const t = (await listTrades(db, alice))[0];
    await createJournal(db, alice, {
      sessionDate: "2026-11-03",
      tradeId: t.id,
      emotion: "CALM",
      emotionNote: "",
      strategyId: t.strategyId,
      followedPlan: "YES",
      impulsive: false,
      mainMistake: "",
      didRight: "ok",
      toImprove: "",
    });
    const backup = JSON.parse(JSON.stringify(await exportBackup(db, alice)));
    const counts = await restoreBackup(db, bob, backup);
    expect(counts).toMatchObject({ trades: 2, cashMovements: 1, journal: 1, strategies: 1 });

    const bobTrades = await listTrades(db, bob);
    const bobJournal = await listJournal(db, bob);
    expect(bobTrades.map((x) => x.profitCents).sort()).toEqual([-3000, 2193]);
    expect(bobTrades.some((x) => x.id === t.id)).toBe(false);
    expect(bobTrades.map((x) => x.id)).toContain(bobJournal[0].tradeId);
    expect((await getSettings(db, bob)).initialCapitalCents).toBe(100000);
    // Source account untouched
    expect(await listTrades(db, alice)).toHaveLength(2);
  });
});
