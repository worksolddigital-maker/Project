import { tradeInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, idParam, json, readJson, requireUser, route, type IdContext } from "@/server/http";
import { deleteTrade, updateTrade } from "@/server/repositories/trades";

export const PATCH = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const id = await idParam(ctx);
  const input = await readJson(request, tradeInputSchema);
  const db = await getDb();
  const trade = await updateTrade(db, user.id, id, input);
  await logEvent(db, user.id, "trade.update", { asset: trade.asset, direction: trade.direction, result: trade.result, profitCents: trade.profitCents }, clientIp(request));
  return json({ trade });
});

export const DELETE = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const db = await getDb();
  const trade = await deleteTrade(db, user.id, await idParam(ctx));
  await logEvent(db, user.id, "trade.delete", { asset: trade.asset, result: trade.result, profitCents: trade.profitCents }, clientIp(request));
  return json({ ok: true });
});
