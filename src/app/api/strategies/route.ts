import { strategyInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { json, readJson, requireUser, route } from "@/server/http";
import { createStrategy, listStrategies } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ strategies: await listStrategies(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, strategyInputSchema);
  return json({ strategy: await createStrategy(await getDb(), user.id, input) }, { status: 201 });
});
