import { cashMovementInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { idParam, json, readJson, requireUser, route, type IdContext } from "@/server/http";
import { deleteCash, updateCash } from "@/server/repositories/entities";

export const PATCH = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const id = await idParam(ctx);
  const input = await readJson(request, cashMovementInputSchema);
  return json({ movement: await updateCash(await getDb(), user.id, id, input) });
});

export const DELETE = route<IdContext>(async (_request, ctx) => {
  const user = await requireUser();
  await deleteCash(await getDb(), user.id, await idParam(ctx));
  return json({ ok: true });
});
