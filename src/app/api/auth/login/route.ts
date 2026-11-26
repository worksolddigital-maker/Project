import { loginSchema } from "@/lib/validation/schemas";
import { rateLimit, resetRateLimit } from "@/server/auth/rate-limit";
import { createSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { ApiError, clientIp, json, readJson, route } from "@/server/http";
import { authenticate } from "@/server/repositories/users";

export const POST = route(async (request) => {
  const input = await readJson(request, loginSchema);
  const ip = clientIp(request);
  // Per device, on top of the per-account lockout done in authenticate().
  const key = `login:${ip}`;
  const limit = rateLimit(key, 20, 15 * 60 * 1000);
  if (!limit.ok) throw new ApiError(429, `Muitas tentativas deste dispositivo. Aguarde ${Math.ceil(limit.retryAfterSec / 60)} min.`);
  const user = await authenticate(await getDb(), input.email, input.password, ip);
  resetRateLimit(key);
  await createSession(user.id, request.headers.get("user-agent") ?? "", ip);
  return json({ user });
});
