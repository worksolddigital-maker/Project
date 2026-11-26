import { deleteAllTradesSchema, tradeInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { createTrade, deleteAllTrades, listTrades } from "@/server/repositories/trades";
import { assertPassword } from "@/server/repositories/users";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ trades: await listTrades(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, tradeInputSchema);
  const db = await getDb();
  const trade = await createTrade(db, user.id, input);
  await logEvent(db, user.id, "trade.create", { asset: trade.asset, direction: trade.direction, result: trade.result, profitCents: trade.profitCents }, clientIp(request));
  return json({ trade }, { status: 201 });
});

export const DELETE = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, deleteAllTradesSchema);
  const db = await getDb();
  await assertPassword(db, user.id, input.password);
  const deleted = await deleteAllTrades(db, user.id);
  await logEvent(db, user.id, "trade.delete_all", { count: deleted }, clientIp(request));
  return json({ deleted });
});
