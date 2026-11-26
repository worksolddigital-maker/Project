import { z } from "zod";
import { rateLimit } from "@/server/auth/rate-limit";
import { ApiError, json, readJson, requireUser, route } from "@/server/http";
import { explainMarket } from "@/server/market/explain";
import { getMarketSnapshot } from "@/server/market/service";

const bodySchema = z.object({ focus: z.string().max(20).nullable().default(null) });

/** "Why did the market move?" — AI summary grounded on the current headlines. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const { focus } = await readJson(request, bodySchema);
  const limit = rateLimit(`explain:${user.id}`, 12, 60 * 60 * 1000);
  if (!limit.ok) throw new ApiError(429, `Muitas explicações pedidas. Aguarde ${Math.ceil(limit.retryAfterSec / 60)} min.`);
  const snapshot = await getMarketSnapshot();
  if (focus && !snapshot.quotes.some((q) => q.symbol === focus)) throw new ApiError(404, "Ativo não acompanhado pelo painel.");
  return json({ result: await explainMarket(snapshot, focus) });
});
