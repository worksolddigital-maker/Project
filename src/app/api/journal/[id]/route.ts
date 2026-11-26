import { journalInputSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, idParam, json, readJson, requireUser, route, type IdContext } from "@/server/http";
import { deleteJournal, updateJournal } from "@/server/repositories/entities";

export const PATCH = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const id = await idParam(ctx);
  const input = await readJson(request, journalInputSchema);
  const db = await getDb();
  const entry = await updateJournal(db, user.id, id, input);
  await logEvent(db, user.id, "journal.update", { sessionDate: entry.sessionDate }, clientIp(request));
  return json({ entry });
});

export const DELETE = route<IdContext>(async (request, ctx) => {
  const user = await requireUser();
  const db = await getDb();
  const entry = await deleteJournal(db, user.id, await idParam(ctx));
  await logEvent(db, user.id, "journal.delete", { sessionDate: entry.sessionDate }, clientIp(request));
  return json({ ok: true });
});
