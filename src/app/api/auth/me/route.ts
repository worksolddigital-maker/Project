import { json, requireUser, route } from "@/server/http";

export const GET = route(async () => {
  const { sessionId: _session, ...user } = await requireUser();
  void _session;
  return json({ user });
});
