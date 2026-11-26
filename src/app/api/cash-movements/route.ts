import { cashMovementInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { json, readJson, requireUser, route } from "@/server/http";
import { createCash, listCash } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ movements: await listCash(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, cashMovementInputSchema);
  return json({ movement: await createCash(await getDb(), user.id, input) }, { status: 201 });
});
