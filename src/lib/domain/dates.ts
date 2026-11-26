/**
 * Timezone aware calendar helpers.
 *
 * Instants are stored as ISO strings (UTC). Grouping by day/week/month is done
 * on "day keys" (YYYY-MM-DD) computed in the user's timezone, then all calendar
 * arithmetic happens on those keys using UTC math, which is immune to DST.
 */

export type DayKey = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(instant: string | number | Date, timeZone: string): ZonedParts {
  const date = instant instanceof Date ? instant : new Date(instant);
  const out: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

export function toDayKey(year: number, month: number, day: number): DayKey {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function dayKeyOf(instant: string | number | Date, timeZone: string): DayKey {
  const p = zonedParts(instant, timeZone);
  return toDayKey(p.year, p.month, p.day);
}

export function hourOf(instant: string | number | Date, timeZone: string): number {
  return zonedParts(instant, timeZone).hour;
}

export function todayKey(timeZone: string, now: Date = new Date()): DayKey {
  return dayKeyOf(now, timeZone);
}

function offsetMs(utcMs: number, timeZone: string): number {
  const p = zonedParts(utcMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Converts a wall-clock date/time in `timeZone` to a UTC ISO instant.
 * `time` accepts HH:mm or HH:mm:ss.
 */
export function zonedWallTimeToIso(day: DayKey, time: string, timeZone: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss);
  let result = guess - offsetMs(guess, timeZone);
  const second = guess - offsetMs(result, timeZone);
  if (second !== result) result = second;
  return new Date(result).toISOString();
}

/** Wall-clock time (HH:mm:ss) of an instant in the timezone. */
export function wallTimeOf(instant: string, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

export function parseDayKey(key: DayKey): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseDayKey(value);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function keyToUtc(key: DayKey): Date {
  const { year, month, day } = parseDayKey(key);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcToKey(d: Date): DayKey {
  return toDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = keyToUtc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return utcToKey(d);
}

export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((keyToUtc(a).getTime() - keyToUtc(b).getTime()) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(key: DayKey): number {
  return keyToUtc(key).getUTCDay();
}

/** Weeks start on Monday (pt-BR / ISO convention). */
export function weekStartOf(key: DayKey): DayKey {
  const wd = weekdayOf(key);
  const back = (wd + 6) % 7;
  return addDays(key, -back);
}

export function monthKeyOf(key: DayKey): MonthKey {
  return key.slice(0, 7);
}

export function monthStartOf(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthEndOf(key: DayKey): DayKey {
  const { year, month } = parseDayKey(key);
  return toDayKey(year, month, daysInMonth(year, month));
}

export function addMonths(monthKey: MonthKey, n: number): MonthKey {
  const [y, m] = monthKey.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${pad(Math.floor(total / 12), 4)}-${pad((total % 12) + 1)}`;
}

/** Monday-first grid of weeks covering the month (6 rows max). */
export function monthGrid(monthKey: MonthKey): DayKey[][] {
  const first = `${monthKey}-01`;
  const start = weekStartOf(first);
  const last = monthEndOf(first);
  const weeks: DayKey[][] = [];
  let cursor = start;
  while (cursor <= last || weeks.length === 0) {
    const week: DayKey[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export interface DateRange {
  from: DayKey | null;
  to: DayKey | null;
}

export function inRange(key: DayKey, range: DateRange): boolean {
  if (range.from && key < range.from) return false;
  if (range.to && key > range.to) return false;
  return true;
}

export const PERIOD_PRESETS = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "last7",
  "last30",
  "last90",
  "thisYear",
  "all",
] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABELS: Record<PeriodPreset | "custom", string> = {
  today: "Hoje",
  yesterday: "Ontem",
  thisWeek: "Esta semana",
  lastWeek: "Semana passada",
  thisMonth: "Este mês",
  lastMonth: "Mês passado",
  last7: "Últimos 7 dias",
  last30: "Últimos 30 dias",
  last90: "Últimos 90 dias",
  thisYear: "Este ano",
  all: "Todo o período",
  custom: "Personalizado",
};

export function resolvePreset(preset: PeriodPreset, today: DayKey): DateRange {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "thisWeek":
      return { from: weekStartOf(today), to: today };
    case "lastWeek": {
      const start = addDays(weekStartOf(today), -7);
      return { from: start, to: addDays(start, 6) };
    }
    case "thisMonth":
      return { from: monthStartOf(today), to: today };
    case "lastMonth": {
      const prev = addMonths(monthKeyOf(today), -1);
      return { from: `${prev}-01`, to: monthEndOf(`${prev}-01`) };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "last90":
      return { from: addDays(today, -89), to: today };
    case "thisYear":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "all":
    default:
      return { from: null, to: null };
  }
}

/** The range of equal length immediately before `range` (for comparisons). */
export function previousRange(range: DateRange): DateRange | null {
  if (!range.from || !range.to) return null;
  const len = diffDays(range.to, range.from) + 1;
  const to = addDays(range.from, -1);
  return { from: addDays(to, -(len - 1)), to };
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LABELS_MON_FIRST = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatDayKey(key: DayKey, style: "short" | "long" | "dayMonth" = "short"): string {
  const { year, month, day } = parseDayKey(key);
  if (style === "dayMonth") return `${pad(day)}/${pad(month)}`;
  if (style === "long") return `${WEEKDAY_SHORT[weekdayOf(key)]}, ${day} de ${MONTHS[month - 1]} de ${year}`;
  return `${pad(day)}/${pad(month)}/${year}`;
}

export function formatMonthKey(key: MonthKey, style: "long" | "short" = "long"): string {
  const [y, m] = key.split("-").map(Number);
  return style === "long" ? `${MONTHS[m - 1]} de ${y}` : `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
}

export function formatDateTime(instant: string, timeZone: string, withSeconds = false): string {
  const p = zonedParts(instant, timeZone);
  const time = withSeconds ? `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` : `${pad(p.hour)}:${pad(p.minute)}`;
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${time}`;
}

export function formatTime(instant: string, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatWeekLabel(weekStart: DayKey): string {
  const end = addDays(weekStart, 6);
  return `${formatDayKey(weekStart, "dayMonth")} – ${formatDayKey(end, "dayMonth")}`;
}

export function weekdayShort(key: DayKey): string {
  return WEEKDAY_SHORT[weekdayOf(key)];
}

/** Common IANA zones offered in the settings screen. */
export const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "Africa/Luanda",
  "Africa/Maputo",
  "Asia/Dubai",
  "Asia/Tokyo",
  "UTC",
];
