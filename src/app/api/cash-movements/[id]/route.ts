import { cashMovementInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, idParam, json, readJson, requireUser, route, type IdContext } from "@/server/http";
import { deleteCash, updateCash } from "@/server/repositories/entities";

export const PATCH = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const id = await idParam(ctx);
  const input = await readJson(request, cashMovementInputSchema);
  const db = await getDb();
  const movement = await updateCash(db, user.id, id, input);
  await logEvent(db, user.id, "cash.update", { type: movement.type, amountCents: movement.amountCents }, clientIp(request));
  return json({ movement });
});

export const DELETE = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const db = await getDb();
  const movement = await deleteCash(db, user.id, await idParam(ctx));
  await logEvent(db, user.id, "cash.delete", { type: movement.type, amountCents: movement.amountCents }, clientIp(request));
  return json({ ok: true });
});
