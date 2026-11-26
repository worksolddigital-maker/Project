import { settingsUpdateSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { json, readJson, requireUser, route } from "@/server/http";
import { getSettings, updateSettings } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ settings: await getSettings(await getDb(), user.id) });
});

export const PATCH = route(async (request) => {
  const user = await requireUser();
  const patch = await readJson(request, settingsUpdateSchema);
  return json({ settings: await updateSettings(await getDb(), user.id, patch) });
});
