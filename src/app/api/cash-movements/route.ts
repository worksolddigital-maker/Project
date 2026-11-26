import { cashMovementInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { createCash, listCash } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ movements: await listCash(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, cashMovementInputSchema);
  const db = await getDb();
  const movement = await createCash(db, user.id, input);
  await logEvent(db, user.id, "cash.create", { type: movement.type, amountCents: movement.amountCents }, clientIp(request));
  return json({ movement }, { status: 201 });
});
