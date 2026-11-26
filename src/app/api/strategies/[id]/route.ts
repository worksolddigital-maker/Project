import { strategyInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, idParam, json, readJson, requireUser, route, type IdContext } from "@/server/http";
import { deleteStrategy, updateStrategy } from "@/server/repositories/entities";

export const PATCH = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const id = await idParam(ctx);
  const input = await readJson(request, strategyInputSchema);
  const db = await getDb();
  const strategy = await updateStrategy(db, user.id, id, input);
  await logEvent(db, user.id, "strategy.update", { name: strategy.name }, clientIp(request));
  return json({ strategy });
});

export const DELETE = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const db = await getDb();
  const strategy = await deleteStrategy(db, user.id, await idParam(ctx));
  await logEvent(db, user.id, "strategy.delete", { name: strategy.name }, clientIp(request));
  return json({ ok: true });
});
