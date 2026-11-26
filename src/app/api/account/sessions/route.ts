import { destroyOtherSessions, listSessions } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { clientIp, json, requireUser, route } from "@/server/http";
import { logEvent } from "@/server/repositories/audit";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ sessions: await listSessions(user.id, user.sessionId) });
});

export const DELETE = route(async (request) => {
  const user = await requireUser();
  const closed = await destroyOtherSessions(user.id, user.sessionId);
  await logEvent(await getDb(), user.id, "auth.sessions_revoked", { count: closed }, clientIp(request));
  return json({ ok: true, closedSessions: closed });
});
