import { registerSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/server/auth/rate-limit";
import { createSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { ApiError, clientIp, json, readJson, route } from "@/server/http";
import { registerUser } from "@/server/repositories/users";

export const POST = route(async (request) => {
  const ip = clientIp(request);
  const limit = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) throw new ApiError(429, `Muitas tentativas. Tente novamente em ${limit.retryAfterSec}s.`);
  const input = await readJson(request, registerSchema);
  const user = await registerUser(await getDb(), input, ip);
  await createSession(user.id, request.headers.get("user-agent") ?? "", ip);
  return json({ user }, { status: 201 });
});
