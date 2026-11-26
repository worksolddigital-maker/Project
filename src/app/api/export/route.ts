import { isDayKey, todayKey } from "@/lib/domain/dates";
import { getDb } from "@/server/db/client";
import { ApiError, requireUser, route } from "@/server/http";
import { getSettings, listCash, listJournal, listStrategies } from "@/server/repositories/entities";
import { listTrades } from "@/server/repositories/trades";
import { buildTradesCsv, buildWorkbook } from "@/server/services/export";

export const GET = route(async (request) => {
  const user = await requireUser();
  const params = request.nextUrl.searchParams;
  const format = params.get("format") ?? "xlsx";
  if (format !== "csv" && format !== "xlsx") throw new ApiError(422, "Formato inválido.");
  const from = params.get("from");
  const to = params.get("to");
  if ((from && !isDayKey(from)) || (to && !isDayKey(to))) throw new ApiError(422, "Período inválido.");
  if (from && to && from > to) throw new ApiError(422, "A data inicial deve ser anterior à final.");
  const range = { from: from || null, to: to || null };

  const db = await getDb();
  const [settings, trades, cash, strategies, journal] = await Promise.all([
    getSettings(db, user.id),
    listTrades(db, user.id),
    listCash(db, user.id),
    listStrategies(db, user.id),
    listJournal(db, user.id),
  ]);
  const data = { settings, trades, cash, strategies, journal, userName: user.name };
  const stamp = todayKey(settings.timezone);
  const suffix = from || to ? `${from ?? "inicio"}_a_${to ?? stamp}` : `completo_${stamp}`;
  const periodLabel = from || to ? `${from ?? "início"} até ${to ?? "hoje"}` : "Todo o período";

  if (format === "csv") {
    return new Response(buildTradesCsv(data, range), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="operacoes_${suffix}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const buffer = await buildWorkbook(data, range, periodLabel);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="relatorio_${suffix}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
