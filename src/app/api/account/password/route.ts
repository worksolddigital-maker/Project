import { changePasswordSchema } from "@/lib/validation/schemas";
import { destroyOtherSessions } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { changePassword } from "@/server/repositories/users";

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, changePasswordSchema);
  await changePassword(await getDb(), user.id, input.currentPassword, input.newPassword, clientIp(request));
  // A password change signs out every other device.
  const closed = await destroyOtherSessions(user.id, user.sessionId);
  return json({ ok: true, closedSessions: closed });
});
