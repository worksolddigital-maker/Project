import { destroySessionByFingerprint } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { ApiError, clientIp, json, requireUser, route } from "@/server/http";
import { logEvent } from "@/server/repositories/audit";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (request, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{16}$/.test(id) || !(await destroySessionByFingerprint(user.id, id, user.sessionId))) {
    throw new ApiError(404, "Sessão não encontrada.");
  }
  await logEvent(await getDb(), user.id, "auth.sessions_revoked", { count: 1 }, clientIp(request));
  return json({ ok: true });
});
