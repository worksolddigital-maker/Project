import { z } from "zod";
import { tradeInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { json, readJson, requireUser, route } from "@/server/http";
import { createTrade, deleteAllTrades, listTrades } from "@/server/repositories/trades";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ trades: await listTrades(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, tradeInputSchema);
  const trade = await createTrade(await getDb(), user.id, input);
  return json({ trade }, { status: 201 });
});

const deleteAllSchema = z.object({ confirmation: z.literal("EXCLUIR", { error: 'Digite "EXCLUIR" para confirmar.' }) });

export const DELETE = route(async (request) => {
  const user = await requireUser();
  await readJson(request, deleteAllSchema);
  const deleted = await deleteAllTrades(await getDb(), user.id);
  return json({ deleted });
});
