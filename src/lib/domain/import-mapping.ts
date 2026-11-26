import { isDayKey, toDayKey, zonedWallTimeToIso } from "./dates";
import { parseMoneyToCents, parsePercent } from "./money";
import { computeProfitCents, normalizeAsset, parseExpiration, validateManualProfit } from "./trade-calc";
import type { Direction, TradeResult } from "./types";

export const IMPORT_FIELDS = [
  "datetime",
  "date",
  "time",
  "asset",
  "direction",
  "stake",
  "expiration",
  "result",
  "payout",
  "profit",
  "strategy",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  datetime: "Data e hora",
  date: "Data",
  time: "Hora",
  asset: "Ativo",
  direction: "Tipo (CALL/PUT)",
  stake: "Valor investido",
  expiration: "Expiração",
  result: "Resultado",
  payout: "Payout (%)",
  profit: "Lucro/Prejuízo",
  strategy: "Estratégia",
  notes: "Observações",
};

export type ImportMapping = Record<ImportField, number | null>;

const ALIASES: Record<ImportField, string[]> = {
  datetime: ["datahora", "dataehora", "datetime", "timestamp", "datadeabertura", "dataabertura", "opentime", "horarioabertura", "createdat"],
  date: ["data", "date", "dia", "dataoperacao", "datadaoperacao"],
  time: ["hora", "horario", "time", "horaabertura", "horadeentrada", "horaentrada"],
  asset: ["ativo", "asset", "par", "paridade", "symbol", "simbolo", "instrumento", "instrument", "ticker", "mercado"],
  direction: ["tipo", "direcao", "direction", "type", "ordem", "operacao", "callput", "sentido", "side", "tipodeoperacao"],
  stake: ["valor", "valorinvestido", "investimento", "investido", "stake", "amount", "valordaentrada", "valorentrada", "montante", "invest", "aposta"],
  expiration: ["expiracao", "expiration", "tempo", "tempodeexpiracao", "duracao", "duration", "timeframe", "prazo", "vencimento", "expiry"],
  result: ["resultado", "result", "status", "outcome", "winloss", "situacao"],
  payout: ["payout", "payoutpct", "porcentagem", "percentual", "rentabilidade", "lucropercentual", "retornopercentual", "payout%"],
  profit: ["lucro", "lucroprejuizo", "lucroouprejuizo", "profit", "pnl", "pl", "profitloss", "resultadofinanceiro", "lucroliquido", "ganho", "ganhoperda"],
  strategy: ["estrategia", "strategy", "setup", "metodo", "tatica"],
  notes: ["observacoes", "observacao", "obs", "notas", "nota", "notes", "note", "comentario", "comentarios", "comments"],
};

export function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]/g, "");
}

export function emptyMapping(): ImportMapping {
  return Object.fromEntries(IMPORT_FIELDS.map((f) => [f, null])) as ImportMapping;
}

export function suggestMapping(headers: readonly string[]): ImportMapping {
  const mapping = emptyMapping();
  const used = new Set<number>();
  const norm = headers.map(normalizeHeader);
  // Pass 1: exact alias match.
  for (const field of IMPORT_FIELDS) {
    const idx = norm.findIndex((h, i) => !used.has(i) && ALIASES[field].includes(h));
    if (idx !== -1) {
      mapping[field] = idx;
      used.add(idx);
    }
  }
  // Pass 2: header contains an alias (longer aliases first to avoid "data" eating "datahora").
  for (const field of IMPORT_FIELDS) {
    if (mapping[field] !== null) continue;
    const aliases = [...ALIASES[field]].filter((a) => a.length >= 4).sort((a, b) => b.length - a.length);
    const idx = norm.findIndex((h, i) => !used.has(i) && aliases.some((a) => h.includes(a)));
    if (idx !== -1) {
      mapping[field] = idx;
      used.add(idx);
    }
  }
  if (mapping.datetime !== null && mapping.date !== null) {
    // Prefer the combined column; keep date only if datetime is missing.
    mapping.date = null;
  }
  return mapping;
}

export function mappingIssues(mapping: ImportMapping): string[] {
  const issues: string[] = [];
  if (mapping.datetime === null && mapping.date === null) issues.push("Mapeie a coluna de data (ou data e hora).");
  if (mapping.asset === null) issues.push("Mapeie a coluna do ativo.");
  if (mapping.direction === null) issues.push("Mapeie a coluna do tipo (CALL/PUT).");
  if (mapping.stake === null) issues.push("Mapeie a coluna do valor investido.");
  if (mapping.result === null && mapping.profit === null) issues.push("Mapeie a coluna de resultado ou de lucro/prejuízo.");
  return issues;
}

const DIRECTION_WORDS: Record<string, Direction> = {
  call: "CALL",
  compra: "CALL",
  comprar: "CALL",
  buy: "CALL",
  up: "CALL",
  alta: "CALL",
  higher: "CALL",
  acima: "CALL",
  sobe: "CALL",
  put: "PUT",
  venda: "PUT",
  vender: "PUT",
  sell: "PUT",
  down: "PUT",
  baixa: "PUT",
  lower: "PUT",
  abaixo: "PUT",
  desce: "PUT",
};

export function parseDirection(v: string): Direction | null {
  const k = normalizeHeader(v);
  return DIRECTION_WORDS[k] ?? null;
}

const RESULT_WORDS: Record<string, TradeResult> = {
  win: "WIN",
  w: "WIN",
  gain: "WIN",
  ganho: "WIN",
  green: "WIN",
  vitoria: "WIN",
  lucro: "WIN",
  won: "WIN",
  acerto: "WIN",
  itm: "WIN",
  loss: "LOSS",
  l: "LOSS",
  lost: "LOSS",
  lose: "LOSS",
  perda: "LOSS",
  red: "LOSS",
  derrota: "LOSS",
  prejuizo: "LOSS",
  erro: "LOSS",
  otm: "LOSS",
  draw: "DRAW",
  d: "DRAW",
  tie: "DRAW",
  empate: "DRAW",
  doji: "DRAW",
  devolvido: "DRAW",
  devolucao: "DRAW",
  refund: "DRAW",
  reembolso: "DRAW",
  atm: "DRAW",
};

export function parseResult(v: string): TradeResult | null {
  return RESULT_WORDS[normalizeHeader(v)] ?? null;
}

/** Excel serial date (days since 1899-12-30) to wall-clock parts. */
function excelSerialToWall(serial: number): { day: string; time: string } | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return null;
  const ms = Math.round(serial * 86_400_000);
  const d = new Date(Date.UTC(1899, 11, 30) + ms);
  const day = toDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
  return { day, time };
}

function parseTimePart(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(am|pm)?$/i);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const sec = Number(m[3] ?? 0);
    const ampm = m[4]?.toLowerCase();
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    if (h > 23 || min > 59 || sec > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  m = s.match(/^0?[.,]\d+$/);
  if (m) {
    const wall = excelSerialToWall(1 + Number(s.replace(",", ".")));
    return wall?.time ?? null;
  }
  return null;
}

function parseDatePart(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const key = toDayKey(Number(m[1]), Number(m[2]), Number(m[3]));
    return isDayKey(key) ? key : null;
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const key = toDayKey(year, Number(m[2]), Number(m[1]));
    return isDayKey(key) ? key : null;
  }
  return null;
}

/**
 * Parses a date (optionally with time) as wall-clock in `tz`.
 * Supports ISO with offset, YYYY-MM-DD[ HH:mm[:ss]], DD/MM/YYYY[ HH:mm[:ss]]
 * and Excel serial numbers.
 */
export function parseImportDateTime(dateValue: string, timeValue: string | null, tz: string): string | null {
  const raw = dateValue.trim();
  if (!raw) return null;
  // Absolute instant with offset.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (/^\d+([.,]\d+)?$/.test(raw) && Number(raw.replace(",", ".")) > 20000) {
    const wall = excelSerialToWall(Number(raw.replace(",", ".")));
    if (!wall) return null;
    const time = timeValue ? parseTimePart(timeValue) ?? null : wall.time;
    if (timeValue && !time) return null;
    return zonedWallTimeToIso(wall.day, time ?? wall.time, tz);
  }
  const [datePart, ...rest] = raw.replace("T", " ").split(/\s+/);
  const day = parseDatePart(datePart);
  if (!day) return null;
  let time: string | null = "00:00:00";
  const inlineTime = rest.join(" ");
  if (inlineTime) time = parseTimePart(inlineTime);
  else if (timeValue && timeValue.trim()) time = parseTimePart(timeValue);
  if (!time) return null;
  return zonedWallTimeToIso(day, time, tz);
}

export interface ImportedTrade {
  executedAt: string;
  asset: string;
  direction: Direction;
  stakeCents: number;
  expirationSeconds: number;
  result: TradeResult;
  payoutPct: number | null;
  profitIsManual: boolean;
  profitCents: number;
  strategyName: string | null;
  notes: string;
}

export type NormalizedRow = { ok: true; trade: ImportedTrade } | { ok: false; errors: string[] };

export interface NormalizeOptions {
  timezone: string;
  /** Used for WIN rows without payout or profit, only if the user opts in. */
  fallbackPayoutPct: number | null;
  /** Expiration used when the column is not mapped or empty. */
  fallbackExpirationSeconds: number | null;
}

const cell = (row: readonly string[], idx: number | null) => (idx === null ? "" : String(row[idx] ?? "").trim());

export function normalizeRow(row: readonly string[], mapping: ImportMapping, opts: NormalizeOptions): NormalizedRow {
  const errors: string[] = [];

  const dateRaw = mapping.datetime !== null ? cell(row, mapping.datetime) : cell(row, mapping.date);
  const timeRaw = mapping.datetime === null ? cell(row, mapping.time) : "";
  const executedAt = parseImportDateTime(dateRaw, timeRaw || null, opts.timezone);
  if (!executedAt) errors.push(`Data inválida: "${dateRaw}${timeRaw ? " " + timeRaw : ""}"`);
  else if (new Date(executedAt).getTime() > Date.now() + 5 * 60_000) errors.push("Data no futuro.");

  const assetRaw = cell(row, mapping.asset);
  const asset = normalizeAsset(assetRaw);
  if (!asset) errors.push("Ativo vazio.");
  else if (asset.length > 40) errors.push("Ativo com mais de 40 caracteres.");

  const dirRaw = cell(row, mapping.direction);
  const direction = parseDirection(dirRaw);
  if (!direction) errors.push(`Tipo inválido: "${dirRaw}" (use CALL ou PUT).`);

  const stakeRaw = cell(row, mapping.stake);
  const stakeParsed = parseMoneyToCents(stakeRaw);
  const stakeCents = stakeParsed === null ? null : Math.abs(stakeParsed);
  if (!stakeCents) errors.push(`Valor investido inválido: "${stakeRaw}"`);

  const expRaw = cell(row, mapping.expiration);
  let expirationSeconds = expRaw ? parseExpiration(expRaw) : opts.fallbackExpirationSeconds;
  if (expRaw && expirationSeconds === null) errors.push(`Expiração inválida: "${expRaw}"`);
  if (!expRaw && expirationSeconds === null) errors.push("Expiração ausente.");
  if (expirationSeconds !== null && (expirationSeconds < 5 || expirationSeconds > 7 * 86400)) {
    errors.push("Expiração fora do intervalo permitido (5s a 7 dias).");
    expirationSeconds = null;
  }

  const profitRaw = cell(row, mapping.profit);
  const profitParsed = profitRaw ? parseMoneyToCents(profitRaw) : null;
  if (profitRaw && profitParsed === null) errors.push(`Lucro/prejuízo inválido: "${profitRaw}"`);

  const resultRaw = cell(row, mapping.result);
  let result = resultRaw ? parseResult(resultRaw) : null;
  if (!result && profitParsed !== null) {
    result = profitParsed > 0 ? "WIN" : profitParsed < 0 ? "LOSS" : "DRAW";
  }
  if (!result) errors.push(resultRaw ? `Resultado inválido: "${resultRaw}"` : "Resultado ausente.");

  const payoutRaw = cell(row, mapping.payout);
  let payoutPct = payoutRaw ? parsePercent(payoutRaw) : null;
  if (payoutRaw && payoutPct === null) errors.push(`Payout inválido: "${payoutRaw}"`);
  if (payoutPct !== null && payoutPct > 0 && payoutPct < 2) payoutPct = Math.round(payoutPct * 10000) / 100; // 0.87 -> 87
  if (payoutPct !== null && (payoutPct < 1 || payoutPct > 500)) {
    errors.push("Payout fora do intervalo (1% a 500%).");
    payoutPct = null;
  }

  let profitCents: number | null = null;
  let profitIsManual = false;
  if (result && stakeCents) {
    if (result === "DRAW") {
      profitCents = 0;
    } else if (profitParsed !== null) {
      let p = profitParsed;
      if (result === "LOSS" && p > 0) p = -p; // losses often exported as positive amounts
      const err = validateManualProfit(result, stakeCents, p);
      if (err) errors.push(err);
      else {
        profitCents = p;
        const auto = computeProfitCents(result, stakeCents, payoutPct);
        profitIsManual = auto === null || auto !== p;
        if (result === "WIN" && payoutPct === null) payoutPct = Math.round((p / stakeCents) * 10000) / 100;
      }
    } else {
      if (result === "WIN" && payoutPct === null && opts.fallbackPayoutPct) payoutPct = opts.fallbackPayoutPct;
      const auto = computeProfitCents(result, stakeCents, payoutPct);
      if (auto === null) errors.push("Operação WIN sem payout nem lucro informado.");
      else profitCents = auto;
    }
  }

  const strategyName = cell(row, mapping.strategy).slice(0, 60) || null;
  const notes = cell(row, mapping.notes).slice(0, 2000);

  if (errors.length || !executedAt || !direction || !stakeCents || !result || expirationSeconds === null || profitCents === null) {
    return { ok: false, errors: errors.length ? errors : ["Linha incompleta."] };
  }
  return {
    ok: true,
    trade: {
      executedAt,
      asset,
      direction,
      stakeCents,
      expirationSeconds,
      result,
      payoutPct,
      profitIsManual,
      profitCents,
      strategyName,
      notes,
    },
  };
}

/** Signature used to skip duplicated rows on import. */
export function tradeSignature(t: { executedAt: string; asset: string; stakeCents: number; result: string; profitCents: number; direction: string }): string {
  return [new Date(t.executedAt).toISOString(), t.asset, t.direction, t.stakeCents, t.result, t.profitCents].join("|");
}

export const IMPORT_TEMPLATE_HEADERS = [
  "data",
  "hora",
  "ativo",
  "tipo",
  "valor",
  "expiracao",
  "resultado",
  "payout",
  "lucro",
  "estrategia",
  "observacoes",
];
