import { registerSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/server/auth/rate-limit";
import { createSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { ApiError, clientIp, json, readJson, route } from "@/server/http";
import { registerUser } from "@/server/repositories/users";

export const POST = route(async (request) => {
  const limit = rateLimit(`register:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) throw new ApiError(429, `Muitas tentativas. Tente novamente em ${limit.retryAfterSec}s.`);
  const input = await readJson(request, registerSchema);
  const db = await getDb();
  const user = await registerUser(db, input);
  await createSession(user.id, request.headers.get("user-agent") ?? "");
  return json({ user }, { status: 201 });
});
