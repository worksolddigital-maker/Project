import { journalInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { createJournal, listJournal } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ entries: await listJournal(await getDb(), user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, journalInputSchema);
  const db = await getDb();
  const entry = await createJournal(db, user.id, input);
  await logEvent(db, user.id, "journal.create", { sessionDate: entry.sessionDate }, clientIp(request));
  return json({ entry }, { status: 201 });
});
