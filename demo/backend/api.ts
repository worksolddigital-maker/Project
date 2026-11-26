/**
 * In-browser implementation of every `/api/*` route used by the screens.
 * It applies the same Zod schemas and domain rules as the server routes
 * (src/app/api), so validation and financial results are identical.
 */
import type { ZodType } from "zod";
import { z } from "zod";
import { todayKey } from "@/lib/domain/dates";
import { suggestMapping, tradeSignature } from "@/lib/domain/import-mapping";
import { normalizeAsset, resolveFinancials } from "@/lib/domain/trade-calc";
import { DEFAULT_SETTINGS, type CashMovement, type JournalEntry, type Strategy, type Trade } from "@/lib/domain/types";
import { MAX_IMPORT_BYTES, parseSheetBytes, SheetError } from "@/lib/import/parse-sheet";
import { buildTradesCsv, buildWorkbook, templateCsv, templateWorkbook } from "@/lib/reports/export-builders";
import {
  BACKUP_FORMAT,
  backupSchema,
  cashMovementInputSchema,
  changePasswordSchema,
  deleteAccountSchema,
  fieldErrors,
  importCommitSchema,
  journalInputSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  settingsUpdateSchema,
  strategyInputSchema,
  tradeInputSchema,
  type Backup,
  type TradeInput,
} from "@/lib/validation/schemas";
import { ApiClientError } from "./errors";
import { getState, initStore, mutate, type Account, type DemoState } from "./store";

/* --------------------------------- helpers -------------------------------- */

export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = c ? c.getRandomValues(new Uint8Array(16)) : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const nowIso = () => new Date().toISOString();
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const fail = (status: number, message: string, fields?: Record<string, string>): never => {
  throw new ApiClientError(status, message, fields ?? {});
};

function parse<T>(schema: ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const fields = fieldErrors(r.error);
    fail(422, Object.values(fields)[0] ?? "Dados inválidos.", fields);
  }
  return (r as { data: T }).data;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password.normalize("NFKC")}`);
  if (crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  let h = 0;
  for (const byte of data) h = (h * 31 + byte) | 0;
  return String(h);
}

function requireAccount(s: DemoState): Account {
  const a = s.accounts.find((x) => x.id === s.session);
  return a ?? fail(401, "Sessão expirada. Entre novamente.");
}

const strip = <T extends { accountId: string }>(v: T): Omit<T, "accountId"> => {
  const { accountId: _a, ...rest } = v;
  void _a;
  return rest;
};

const byExecutedDesc = (a: Trade, b: Trade) =>
  a.executedAt === b.executedAt ? (a.createdAt < b.createdAt ? 1 : -1) : a.executedAt < b.executedAt ? 1 : -1;

const publicUser = (a: Account) => ({ id: a.id, name: a.name, email: a.email, createdAt: a.createdAt });

function tradeValues(input: TradeInput) {
  const fin = resolveFinancials(input);
  if (!fin.ok) fail(422, fin.error, { [fin.field]: fin.error });
  const ok = fin as { profitCents: number; profitIsManual: boolean };
  return {
    executedAt: new Date(input.executedAt).toISOString(),
    asset: normalizeAsset(input.asset),
    direction: input.direction,
    stakeCents: input.stakeCents,
    expirationSeconds: input.expirationSeconds,
    result: input.result,
    payoutPct: input.payoutPct === null ? null : Math.round(input.payoutPct * 100) / 100,
    profitCents: ok.profitCents,
    profitIsManual: ok.profitIsManual,
    strategyId: input.strategyId,
    notes: input.notes,
  };
}

function assertStrategy(s: DemoState, accountId: string, id: string | null) {
  if (id && !s.strategies.some((x) => x.id === id && x.accountId === accountId)) {
    fail(422, "Estratégia não encontrada.", { strategyId: "Estratégia não encontrada." });
  }
}

/* ---------------------------------- routes --------------------------------- */

type Init = RequestInit & { json?: unknown };

const confirmSchema = z.object({ confirmation: z.literal("EXCLUIR", { error: 'Digite "EXCLUIR" para confirmar.' }) });

export async function handleRequest(path: string, init: Init = {}): Promise<unknown> {
  await initStore();
  await new Promise((r) => window.setTimeout(r, 70));
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(path, "https://demo.local");
  const seg = url.pathname.split("/").filter(Boolean).slice(1); // drop "api"
  const body = init.json;
  const s = getState();
  const key = `${method} ${seg[0]}${seg[1] ? `/${seg.length > 2 ? `${seg[1]}/:id` : seg[1]}` : ""}`;

  switch (`${method} /${seg.join("/")}`) {
    /* ------------------------------- auth ------------------------------- */
    case "POST /auth/register": {
      const input = parse(registerSchema, body);
      if (s.accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
        fail(409, "Este e-mail já está cadastrado.", { email: "Este e-mail já está cadastrado." });
      }
      const salt = uuid();
      const account: Account = {
        id: uuid(),
        name: input.name,
        email: input.email,
        salt,
        passwordHash: await hashPassword(input.password, salt),
        createdAt: nowIso(),
      };
      mutate((st) => {
        st.accounts.push(account);
        st.settings[account.id] = { ...DEFAULT_SETTINGS, ...(input.timezone ? { timezone: input.timezone } : {}) };
        st.session = account.id;
      });
      return { user: publicUser(account) };
    }
    case "POST /auth/login": {
      const input = parse(loginSchema, body);
      const a = s.accounts.find((x) => x.email.toLowerCase() === input.email.toLowerCase());
      if (!a || (await hashPassword(input.password, a.salt)) !== a.passwordHash) fail(401, "E-mail ou senha incorretos.");
      mutate((st) => {
        st.session = a!.id;
      });
      return { user: publicUser(a!) };
    }
    case "POST /auth/logout":
      mutate((st) => {
        st.session = null;
      });
      return { ok: true };
    case "GET /auth/me":
      return { user: publicUser(requireAccount(s)) };

    /* ------------------------------ account ----------------------------- */
    case "PATCH /account": {
      const a = requireAccount(s);
      const input = parse(profileSchema, body);
      if (s.accounts.some((x) => x.id !== a.id && x.email.toLowerCase() === input.email.toLowerCase())) {
        fail(409, "Este e-mail já está em uso.", { email: "Este e-mail já está em uso." });
      }
      mutate(() => {
        a.name = input.name;
        a.email = input.email;
      });
      return { user: publicUser(a) };
    }
    case "DELETE /account": {
      const a = requireAccount(s);
      const input = parse(deleteAccountSchema, body);
      if ((await hashPassword(input.password, a.salt)) !== a.passwordHash) fail(422, "Senha incorreta.", { password: "Senha incorreta." });
      mutate((st) => removeAccount(st, a.id));
      return { ok: true };
    }
    case "POST /account/password": {
      const a = requireAccount(s);
      const input = parse(changePasswordSchema, body);
      if ((await hashPassword(input.currentPassword, a.salt)) !== a.passwordHash) {
        fail(422, "Senha atual incorreta.", { currentPassword: "Senha atual incorreta." });
      }
      const salt = uuid();
      const hash = await hashPassword(input.newPassword, salt);
      mutate(() => {
        a.salt = salt;
        a.passwordHash = hash;
      });
      return { ok: true, closedSessions: 0 };
    }
    case "DELETE /account/sessions":
      requireAccount(s);
      return { ok: true, closedSessions: 0 };

    /* ------------------------------ settings ---------------------------- */
    case "GET /settings": {
      const a = requireAccount(s);
      return { settings: clone(s.settings[a.id] ?? DEFAULT_SETTINGS) };
    }
    case "PATCH /settings": {
      const a = requireAccount(s);
      const patch = parse(settingsUpdateSchema, body);
      if (patch.defaultPayoutPct !== undefined) patch.defaultPayoutPct = Math.round(patch.defaultPayoutPct * 100) / 100;
      mutate((st) => {
        st.settings[a.id] = { ...(st.settings[a.id] ?? DEFAULT_SETTINGS), ...patch };
      });
      return { settings: clone(getState().settings[a.id]) };
    }

    /* ------------------------------- trades ----------------------------- */
    case "GET /trades": {
      const a = requireAccount(s);
      return { trades: s.trades.filter((t) => t.accountId === a.id).map(strip).sort(byExecutedDesc) };
    }
    case "POST /trades": {
      const a = requireAccount(s);
      const input = parse(tradeInputSchema, body);
      assertStrategy(s, a.id, input.strategyId);
      const t = { id: uuid(), accountId: a.id, ...tradeValues(input), createdAt: nowIso(), updatedAt: nowIso() };
      mutate((st) => st.trades.push(t));
      return { trade: strip(t) };
    }
    case "DELETE /trades": {
      const a = requireAccount(s);
      parse(confirmSchema, body);
      const removed = s.trades.filter((t) => t.accountId === a.id).map((t) => t.id);
      mutate((st) => {
        st.trades = st.trades.filter((t) => t.accountId !== a.id);
        st.journal.forEach((j) => {
          if (j.tradeId && removed.includes(j.tradeId)) j.tradeId = null;
        });
      });
      return { deleted: removed.length };
    }

    /* --------------------------- cash movements ------------------------- */
    case "GET /cash-movements": {
      const a = requireAccount(s);
      return {
        movements: s.cash
          .filter((c) => c.accountId === a.id)
          .map(strip)
          .sort((x, y) => (x.occurredAt < y.occurredAt ? 1 : -1)),
      };
    }
    case "POST /cash-movements": {
      const a = requireAccount(s);
      const input = parse(cashMovementInputSchema, body);
      const c = { id: uuid(), accountId: a.id, ...input, occurredAt: new Date(input.occurredAt).toISOString(), createdAt: nowIso() };
      mutate((st) => st.cash.push(c));
      return { movement: strip(c) };
    }

    /* ----------------------------- strategies --------------------------- */
    case "GET /strategies": {
      const a = requireAccount(s);
      return { strategies: s.strategies.filter((x) => x.accountId === a.id).map(strip).sort((x, y) => x.name.localeCompare(y.name)) };
    }
    case "POST /strategies": {
      const a = requireAccount(s);
      const input = parse(strategyInputSchema, body);
      assertUniqueStrategy(s, a.id, input.name);
      const st = { id: uuid(), accountId: a.id, ...input, createdAt: nowIso() };
      mutate((x) => x.strategies.push(st));
      return { strategy: strip(st) };
    }

    /* ------------------------------ journal ----------------------------- */
    case "GET /journal": {
      const a = requireAccount(s);
      return {
        entries: s.journal
          .filter((j) => j.accountId === a.id)
          .map(strip)
          .sort((x, y) => (x.sessionDate === y.sessionDate ? (x.createdAt < y.createdAt ? 1 : -1) : x.sessionDate < y.sessionDate ? 1 : -1)),
      };
    }
    case "POST /journal": {
      const a = requireAccount(s);
      const input = parse(journalInputSchema, body);
      assertJournalRefs(s, a.id, input.tradeId, input.strategyId);
      const j = { id: uuid(), accountId: a.id, ...input, createdAt: nowIso(), updatedAt: nowIso() };
      mutate((x) => x.journal.push(j));
      return { entry: strip(j) };
    }

    /* ------------------------------ import ------------------------------ */
    case "POST /import/parse": {
      requireAccount(s);
      const file = init.body instanceof FormData ? init.body.get("file") : null;
      if (!(file instanceof File)) fail(422, "Selecione um arquivo.");
      const f = file as File;
      if (f.size > MAX_IMPORT_BYTES) fail(413, "Arquivo maior que 8 MB.");
      try {
        const sheet = await parseSheetBytes(f.name, new Uint8Array(await f.arrayBuffer()));
        return { ...sheet, fileName: f.name, mapping: suggestMapping(sheet.headers) };
      } catch (err) {
        if (err instanceof SheetError) fail(err.status, err.message);
        throw err;
      }
    }
    case "POST /import/commit": {
      const a = requireAccount(s);
      const input = parse(importCommitSchema, body);
      return commitImport(a.id, input.trades, input.skipDuplicates);
    }

    /* ------------------------------ backup ------------------------------ */
    case "POST /backup": {
      const a = requireAccount(s);
      const backup = parse(backupSchema, body);
      return { restored: restoreBackup(a.id, backup) };
    }
  }

  // Routes with an id segment.
  if (seg.length === 2) {
    const a = requireAccount(s);
    const id = seg[1];
    switch (`${method} ${seg[0]}`) {
      case "PATCH trades": {
        const input = parse(tradeInputSchema, body);
        assertStrategy(s, a.id, input.strategyId);
        const t = s.trades.find((x) => x.id === id && x.accountId === a.id) ?? fail(404, "Operação não encontrada.");
        mutate(() => Object.assign(t, tradeValues(input), { updatedAt: nowIso() }));
        return { trade: strip(t) };
      }
      case "DELETE trades": {
        if (!s.trades.some((x) => x.id === id && x.accountId === a.id)) fail(404, "Operação não encontrada.");
        mutate((st) => {
          st.trades = st.trades.filter((x) => x.id !== id);
          st.journal.forEach((j) => {
            if (j.tradeId === id) j.tradeId = null;
          });
        });
        return { ok: true };
      }
      case "PATCH cash-movements": {
        const input = parse(cashMovementInputSchema, body);
        const c = s.cash.find((x) => x.id === id && x.accountId === a.id) ?? fail(404, "Movimentação não encontrada.");
        mutate(() => Object.assign(c, input, { occurredAt: new Date(input.occurredAt).toISOString() }));
        return { movement: strip(c) };
      }
      case "DELETE cash-movements": {
        if (!s.cash.some((x) => x.id === id && x.accountId === a.id)) fail(404, "Movimentação não encontrada.");
        mutate((st) => {
          st.cash = st.cash.filter((x) => x.id !== id);
        });
        return { ok: true };
      }
      case "PATCH strategies": {
        const input = parse(strategyInputSchema, body);
        const st = s.strategies.find((x) => x.id === id && x.accountId === a.id) ?? fail(404, "Estratégia não encontrada.");
        assertUniqueStrategy(s, a.id, input.name, id);
        mutate(() => Object.assign(st, input));
        return { strategy: strip(st) };
      }
      case "DELETE strategies": {
        if (!s.strategies.some((x) => x.id === id && x.accountId === a.id)) fail(404, "Estratégia não encontrada.");
        mutate((x) => {
          x.strategies = x.strategies.filter((v) => v.id !== id);
          x.trades.forEach((t) => {
            if (t.strategyId === id) t.strategyId = null;
          });
          x.journal.forEach((j) => {
            if (j.strategyId === id) j.strategyId = null;
          });
        });
        return { ok: true };
      }
      case "PATCH journal": {
        const input = parse(journalInputSchema, body);
        assertJournalRefs(s, a.id, input.tradeId, input.strategyId);
        const j = s.journal.find((x) => x.id === id && x.accountId === a.id) ?? fail(404, "Anotação não encontrada.");
        mutate(() => Object.assign(j, input, { updatedAt: nowIso() }));
        return { entry: strip(j) };
      }
      case "DELETE journal": {
        if (!s.journal.some((x) => x.id === id && x.accountId === a.id)) fail(404, "Anotação não encontrada.");
        mutate((x) => {
          x.journal = x.journal.filter((v) => v.id !== id);
        });
        return { ok: true };
      }
    }
  }
  return fail(404, `Rota não encontrada na demo: ${key}`);
}

function assertUniqueStrategy(s: DemoState, accountId: string, name: string, exceptId?: string) {
  if (s.strategies.some((x) => x.accountId === accountId && x.id !== exceptId && x.name.toLowerCase() === name.toLowerCase())) {
    fail(409, "Já existe uma estratégia com esse nome.", { name: "Já existe uma estratégia com esse nome." });
  }
}

function assertJournalRefs(s: DemoState, accountId: string, tradeId: string | null, strategyId: string | null) {
  if (tradeId && !s.trades.some((t) => t.id === tradeId && t.accountId === accountId)) {
    fail(422, "Operação vinculada não encontrada.", { tradeId: "Operação não encontrada." });
  }
  assertStrategy(s, accountId, strategyId);
}

function removeAccount(st: DemoState, id: string) {
  st.accounts = st.accounts.filter((a) => a.id !== id);
  delete st.settings[id];
  st.trades = st.trades.filter((x) => x.accountId !== id);
  st.cash = st.cash.filter((x) => x.accountId !== id);
  st.strategies = st.strategies.filter((x) => x.accountId !== id);
  st.journal = st.journal.filter((x) => x.accountId !== id);
  if (st.session === id) st.session = null;
}

function commitImport(accountId: string, rows: z.infer<typeof importCommitSchema>["trades"], skipDuplicates: boolean) {
  const s = getState();
  const byName = new Map(s.strategies.filter((x) => x.accountId === accountId).map((x) => [x.name.toLowerCase(), x.id]));
  const newStrategies: (Strategy & { accountId: string })[] = [];
  for (const name of new Set(rows.map((r) => r.strategyName?.trim()).filter(Boolean) as string[])) {
    if (byName.has(name.toLowerCase())) continue;
    const st = { id: uuid(), accountId, name, description: "", createdAt: nowIso() };
    byName.set(name.toLowerCase(), st.id);
    newStrategies.push(st);
  }
  const seen = new Set(skipDuplicates ? s.trades.filter((t) => t.accountId === accountId).map(tradeSignature) : []);
  let duplicates = 0;
  const created: (Trade & { accountId: string })[] = [];
  for (const r of rows) {
    if (skipDuplicates) {
      const sig = tradeSignature(r);
      if (seen.has(sig)) {
        duplicates++;
        continue;
      }
      seen.add(sig);
    }
    created.push({
      id: uuid(),
      accountId,
      executedAt: new Date(r.executedAt).toISOString(),
      asset: r.asset,
      direction: r.direction,
      stakeCents: r.stakeCents,
      expirationSeconds: r.expirationSeconds,
      result: r.result,
      payoutPct: r.payoutPct,
      profitCents: r.profitCents,
      profitIsManual: r.profitIsManual,
      strategyId: r.strategyName ? byName.get(r.strategyName.trim().toLowerCase()) ?? null : null,
      notes: r.notes,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  mutate((st) => {
    st.strategies.push(...newStrategies);
    st.trades.push(...created);
  });
  return { inserted: created.length, duplicates, strategiesCreated: newStrategies.length };
}

function exportBackup(accountId: string): Backup {
  const s = getState();
  return clone({
    format: BACKUP_FORMAT,
    version: 1 as const,
    exportedAt: nowIso(),
    settings: s.settings[accountId] ?? DEFAULT_SETTINGS,
    strategies: s.strategies.filter((x) => x.accountId === accountId).map(strip),
    trades: s.trades.filter((x) => x.accountId === accountId).map(strip),
    cashMovements: s.cash.filter((x) => x.accountId === accountId).map(strip),
    journal: s.journal.filter((x) => x.accountId === accountId).map(strip),
  });
}

function restoreBackup(accountId: string, b: Backup) {
  const strategyIds = new Map<string, string>();
  const tradeIds = new Map<string, string>();
  const strategies: (Strategy & { accountId: string })[] = [];
  const seenNames = new Set<string>();
  for (const st of b.strategies) {
    const k = st.name.trim().toLowerCase();
    if (seenNames.has(k)) continue;
    seenNames.add(k);
    const id = uuid();
    strategyIds.set(st.id, id);
    strategies.push({ ...st, id, accountId, name: st.name.trim() });
  }
  const trades = b.trades.map((t) => {
    const id = uuid();
    tradeIds.set(t.id, id);
    return { ...t, id, accountId, strategyId: t.strategyId ? strategyIds.get(t.strategyId) ?? null : null };
  });
  const cash: (CashMovement & { accountId: string })[] = b.cashMovements.map((c) => ({ ...c, id: uuid(), accountId }));
  const journal: (JournalEntry & { accountId: string })[] = b.journal.map((j) => ({
    ...j,
    id: uuid(),
    accountId,
    tradeId: j.tradeId ? tradeIds.get(j.tradeId) ?? null : null,
    strategyId: j.strategyId ? strategyIds.get(j.strategyId) ?? null : null,
  }));
  mutate((st) => {
    st.settings[accountId] = { ...b.settings };
    st.strategies = [...st.strategies.filter((x) => x.accountId !== accountId), ...strategies];
    st.trades = [...st.trades.filter((x) => x.accountId !== accountId), ...trades];
    st.cash = [...st.cash.filter((x) => x.accountId !== accountId), ...cash];
    st.journal = [...st.journal.filter((x) => x.accountId !== accountId), ...journal];
  });
  return { trades: trades.length, cashMovements: cash.length, strategies: strategies.length, journal: journal.length };
}

/* --------------------------------- downloads -------------------------------- */

export interface GeneratedFile {
  filename: string;
  data: string | Uint8Array;
  type: string;
}

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Builds the file the matching GET route would return. */
export async function buildDownload(path: string): Promise<GeneratedFile> {
  await initStore();
  const s = getState();
  const a = requireAccount(s);
  const url = new URL(path, "https://demo.local");
  const p = url.searchParams;
  const settings = s.settings[a.id] ?? DEFAULT_SETTINGS;
  const stamp = todayKey(settings.timezone);

  if (url.pathname === "/api/import/template") {
    return p.get("format") === "xlsx"
      ? { filename: "modelo-importacao.xlsx", data: await templateWorkbook(), type: XLSX }
      : { filename: "modelo-importacao.csv", data: templateCsv(), type: "text/csv" };
  }
  if (url.pathname === "/api/backup") {
    return { filename: `backup_trading_${stamp}.json`, data: JSON.stringify(exportBackup(a.id), null, 2), type: "application/json" };
  }
  if (url.pathname === "/api/export") {
    const from = p.get("from") || null;
    const to = p.get("to") || null;
    const range = { from, to };
    const b = exportBackup(a.id);
    const data = { settings, trades: b.trades, cash: b.cashMovements, strategies: b.strategies, journal: b.journal, userName: a.name };
    const suffix = from || to ? `${from ?? "inicio"}_a_${to ?? stamp}` : `completo_${stamp}`;
    if (p.get("format") === "csv") return { filename: `operacoes_${suffix}.csv`, data: buildTradesCsv(data, range), type: "text/csv" };
    const label = from || to ? `${from ?? "início"} até ${to ?? "hoje"}` : "Todo o período";
    return { filename: `relatorio_${suffix}.xlsx`, data: await buildWorkbook(data, range, label), type: XLSX };
  }
  return fail(404, "Arquivo não disponível na demo.");
}
