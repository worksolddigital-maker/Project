import { destroyCurrentSession, getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { clientIp, json, route } from "@/server/http";
import { logEvent } from "@/server/repositories/audit";

export const POST = route(async (request) => {
  const user = await getCurrentUser();
  if (user) await logEvent(await getDb(), user.id, "auth.logout", {}, clientIp(request));
  await destroyCurrentSession();
  return json({ ok: true });
});
