import { destroyOtherSessions } from "@/server/auth/session";
import { json, requireUser, route } from "@/server/http";

export const DELETE = route(async () => {
  const user = await requireUser();
  const closed = await destroyOtherSessions(user.id, user.sessionId);
  return json({ ok: true, closedSessions: closed });
});
