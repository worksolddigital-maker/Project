import { loginSchema } from "@/lib/validation/schemas";
import { rateLimit, resetRateLimit } from "@/server/auth/rate-limit";
import { createSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { ApiError, clientIp, json, readJson, route } from "@/server/http";
import { authenticate } from "@/server/repositories/users";

export const POST = route(async (request) => {
  const input = await readJson(request, loginSchema);
  const key = `login:${clientIp(request)}:${input.email}`;
  const limit = rateLimit(key, 8, 15 * 60 * 1000);
  if (!limit.ok) {
    throw new ApiError(429, `Muitas tentativas de login. Aguarde ${Math.ceil(limit.retryAfterSec / 60)} min.`);
  }
  const db = await getDb();
  const user = await authenticate(db, input.email, input.password);
  if (!user) throw new ApiError(401, "E-mail ou senha incorretos.");
  resetRateLimit(key);
  await createSession(user.id, request.headers.get("user-agent") ?? "");
  return json({ user });
});
