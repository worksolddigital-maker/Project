import {
  addDays,
  todayKey,
  weekdayOf,
  zonedWallTimeToIso,
} from "@/lib/domain/dates";

/**
 * Main trading sessions, defined in each market's own time zone so that
 * daylight-saving changes (London, New York, Sydney) are handled by the
 * time-zone database. Forex hours are the usual market convention.
 */
export interface MarketSession {
  id: string;
  name: string;
  city: string;
  timeZone: string;
  open: string;
  close: string;
  note: string;
}

export const SESSIONS: MarketSession[] = [
  {
    id: "sydney",
    name: "Sydney",
    city: "Austrália",
    timeZone: "Australia/Sydney",
    open: "07:00",
    close: "16:00",
    note: "Abre a semana do forex. Movimento costuma ser mais calmo, com destaque para AUD e NZD.",
  },
  {
    id: "toquio",
    name: "Tóquio",
    city: "Japão",
    timeZone: "Asia/Tokyo",
    open: "09:00",
    close: "18:00",
    note: "Pares com iene (JPY) e moedas asiáticas ganham volume.",
  },
  {
    id: "londres",
    name: "Londres",
    city: "Reino Unido",
    timeZone: "Europe/London",
    open: "08:00",
    close: "17:00",
    note: "Maior volume do forex. EUR, GBP e CHF ficam mais ativos; a abertura costuma ser agitada.",
  },
  {
    id: "nova-york",
    name: "Nova York",
    city: "Estados Unidos",
    timeZone: "America/New_York",
    open: "08:00",
    close: "17:00",
    note: "Dólar no centro. Dados dos EUA costumam sair às 8h30 de Nova York; a bolsa abre às 9h30.",
  },
];

export interface SessionWindow {
  session: MarketSession;
  start: string;
  end: string;
  open: boolean;
}

/** Today's window of each session (in absolute time) and whether it is open now. */
export function sessionWindows(now: Date = new Date()): SessionWindow[] {
  return SESSIONS.map((s) => {
    // The session "today" in its own city; if it already closed, show the next one.
    let day = todayKey(s.timeZone, now);
    let start = zonedWallTimeToIso(day, `${s.open}:00`, s.timeZone);
    let end = zonedWallTimeToIso(day, `${s.close}:00`, s.timeZone);
    for (
      let i = 0;
      i < 7 && (Date.parse(end) <= now.getTime() || isWeekend(day));
      i++
    ) {
      day = addDays(day, 1);
      start = zonedWallTimeToIso(day, `${s.open}:00`, s.timeZone);
      end = zonedWallTimeToIso(day, `${s.close}:00`, s.timeZone);
    }
    const t = now.getTime();
    return {
      session: s,
      start,
      end,
      open: t >= Date.parse(start) && t < Date.parse(end),
    };
  });
}

function isWeekend(day: string) {
  const w = weekdayOf(day);
  return w === 0 || w === 6;
}

/** Whether London and New York are open at the same time (the busiest hours of forex). */
export const londonNewYorkOverlap = (windows: SessionWindow[]) =>
  windows.filter(
    (w) =>
      (w.session.id === "londres" || w.session.id === "nova-york") && w.open,
  ).length === 2;

/** How the analysis timeframe relates to the expiry or holding time. */
export const TIMEFRAMES: {
  tf: string;
  label: string;
  use: string;
  context: string;
}[] = [
  {
    tf: "M1",
    label: "1 minuto",
    use: "Gatilho de entrada para expirações de 1 a 2 minutos. Tem muito ruído: um candle sozinho quase não diz nada.",
    context: "Confira a tendência no M5 e no M15 antes.",
  },
  {
    tf: "M5",
    label: "5 minutos",
    use: "Gatilho para expirações de 5 a 15 minutos e leitura do movimento da sessão.",
    context: "Confira a tendência no M15 e no H1.",
  },
  {
    tf: "M15",
    label: "15 minutos",
    use: "Mostra a tendência do dia e os suportes e resistências mais respeitados nas operações curtas.",
    context: "Confira o H1 e o H4.",
  },
  {
    tf: "H1",
    label: "1 hora",
    use: "Níveis importantes do dia e da semana. Padrões aqui pesam mais que no M1.",
    context: "Confira o H4 e o diário.",
  },
  {
    tf: "H4",
    label: "4 horas",
    use: "Tendência de vários dias. Bom para marcar zonas de suporte e resistência antes de operar.",
    context: "Confira o diário.",
  },
  {
    tf: "D1",
    label: "Diário",
    use: "A tendência principal. Topos e fundos diários são as zonas mais fortes.",
    context: "Confira o semanal.",
  },
];
