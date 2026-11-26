import { getDb } from "@/server/db/client";
import { json, requireUser, route } from "@/server/http";
import { listEvents } from "@/server/repositories/audit";

/** `?kind=security` (sign-ins, password changes) or `?kind=activity` (changes to data). */
export const GET = route(async (request) => {
  const user = await requireUser();
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind") === "security" ? "security" : "activity";
  const limit = Number(params.get("limit") ?? 50) || 50;
  return json({ events: await listEvents(await getDb(), user.id, kind, limit) });
});
