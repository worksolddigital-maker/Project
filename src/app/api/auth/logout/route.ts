import { destroyCurrentSession } from "@/server/auth/session";
import { json, route } from "@/server/http";

export const POST = route(async () => {
  await destroyCurrentSession();
  return json({ ok: true });
});
