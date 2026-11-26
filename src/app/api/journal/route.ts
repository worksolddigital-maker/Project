import { journalInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { json, readJson, requireUser, route } from "@/server/http";
import { createJournal, listJournal } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ entries: await listJournal(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, journalInputSchema);
  return json({ entry: await createJournal(await getDb(), user.id, input) }, { status: 201 });
});
