import { deleteAccountSchema, profileSchema } from "@/lib/validation/schemas";
import { destroyCurrentSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { deleteUser, updateProfile } from "@/server/repositories/users";

export const PATCH = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, profileSchema);
  return json({ user: await updateProfile(await getDb(), user.id, input, clientIp(request)) });
});

export const DELETE = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, deleteAccountSchema);
  await deleteUser(await getDb(), user.id, input.password);
  await destroyCurrentSession();
  return json({ ok: true });
});
