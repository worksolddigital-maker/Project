import { strategyInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { createStrategy, listStrategies } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ strategies: await listStrategies(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, strategyInputSchema);
  const db = await getDb();
  const strategy = await createStrategy(db, user.id, input);
  await logEvent(db, user.id, "strategy.create", { name: strategy.name }, clientIp(request));
  return json({ strategy }, { status: 201 });
});
