import { json, requireUser, route } from "@/server/http";
import { getMarketSnapshot } from "@/server/market/service";

/** Quotes and headlines from public sources (cached per source on the server). */
export const GET = route(async () => {
  await requireUser();
  return json({ market: await getMarketSnapshot() }, { headers: { "Cache-Control": "no-store" } });
});
