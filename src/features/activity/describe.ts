import { formatMoney } from "@/lib/domain/money";
import { RESULT_LABELS, type Currency, type TradeResult } from "@/lib/domain/types";
import { AUDIT_ACTIONS, type AuditEvent } from "@/lib/security";

const FIELD_LABELS: Record<string, string> = {
  initialCapitalCents: "capital inicial",
  defaultPayoutPct: "payout padrão",
  maxStakeCents: "valor máximo por operação",
  riskPerTradePct: "risco por operação",
  dailyLossLimitCents: "limite diário de perda",
  dailyProfitGoalCents: "meta diária",
  weeklyProfitGoalCents: "meta semanal",
  monthlyProfitGoalCents: "meta mensal",
  maxTradesPerDay: "máximo de operações por dia",
  maxConsecutiveLosses: "máximo de perdas consecutivas",
  maxDrawdownPct: "drawdown máximo",
  maxDailyExposurePct: "exposição diária máxima",
  currency: "moeda",
  timezone: "fuso horário",
  assetPrefs: "payouts dos ativos",
};

export type EventTone = "pos" | "neg" | "warn" | "neutral";

/** Human description of an activity/security event. */
export function describeEvent(e: AuditEvent, currency: Currency): { title: string; detail: string; tone: EventTone } {
  let d: Record<string, unknown> = {};
  try {
    d = JSON.parse(e.detail || "{}");
  } catch {
    d = {};
  }
  const title = AUDIT_ACTIONS[e.action] ?? e.action;
  const money = (v: unknown) => (typeof v === "number" ? formatMoney(v, currency, { signed: true }) : "");
  switch (e.action) {
    case "trade.create":
    case "trade.update":
    case "trade.delete": {
      const result = d.result as TradeResult | undefined;
      const parts = [d.asset, d.direction, result ? RESULT_LABELS[result] : null, money(d.profitCents)].filter(Boolean);
      const tone: EventTone = e.action === "trade.delete" ? "neutral" : typeof d.profitCents === "number" ? (d.profitCents > 0 ? "pos" : d.profitCents < 0 ? "neg" : "neutral") : "neutral";
      return { title, detail: parts.join(" · "), tone };
    }
    case "trade.delete_all":
      return { title, detail: `${d.count ?? 0} operação(ões)`, tone: "warn" };
    case "cash.create":
    case "cash.update":
    case "cash.delete": {
      const amount = typeof d.amountCents === "number" ? formatMoney(d.amountCents, currency) : "";
      return { title, detail: `${d.type === "WITHDRAWAL" ? "Retirada" : "Depósito"} ${amount}`.trim(), tone: "neutral" };
    }
    case "strategy.create":
    case "strategy.update":
    case "strategy.delete":
      return { title, detail: String(d.name ?? ""), tone: "neutral" };
    case "journal.create":
    case "journal.update":
    case "journal.delete":
      return { title, detail: d.sessionDate ? `Sessão de ${String(d.sessionDate).split("-").reverse().join("/")}` : "", tone: "neutral" };
    case "settings.update": {
      const fields = Array.isArray(d.fields) ? (d.fields as string[]).map((f) => FIELD_LABELS[f] ?? f) : [];
      return { title, detail: fields.join(", "), tone: "neutral" };
    }
    case "import.commit":
      return { title, detail: `${d.inserted ?? 0} importada(s), ${d.duplicates ?? 0} duplicada(s) ignorada(s)`, tone: "neutral" };
    case "backup.restore":
      return { title, detail: `${d.trades ?? 0} operações restauradas`, tone: "warn" };
    case "auth.login_failed":
      return { title, detail: `Tentativa ${d.attempts ?? ""}`.trim(), tone: "warn" };
    case "auth.locked":
      return { title, detail: "Acesso suspenso temporariamente", tone: "neg" };
    case "auth.sessions_revoked":
      return { title, detail: `${d.count ?? 0} sessão(ões)`, tone: "neutral" };
    case "auth.login":
    case "auth.register":
      return { title, detail: "", tone: "pos" };
    default:
      return { title, detail: "", tone: "neutral" };
  }
}

/** "Chrome · Windows" from a user-agent string. */
export function describeUserAgent(ua: string): string {
  if (!ua) return "Dispositivo desconhecido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Brave/.test(ua)
        ? "Brave"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

/** "há 5 min", "há 2 h", "há 3 dias". */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}
