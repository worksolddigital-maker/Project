import { settingsUpdateSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { getSettings, updateSettings } from "@/server/repositories/entities";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ settings: await getSettings(await getDb(), user.id) });
});

export const PATCH = route(async (request) => {
  const user = await requireUser();
  const patch = await readJson(request, settingsUpdateSchema);
  const db = await getDb();
  const settings = await updateSettings(db, user.id, patch);
  const fields = Object.keys(patch).filter((k) => k !== "reducedMotion" && k !== "smoothScroll");
  if (fields.length) await logEvent(db, user.id, "settings.update", { fields }, clientIp(request));
  return json({ settings });
});
