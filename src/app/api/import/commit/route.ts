import { importCommitSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { commitImport } from "@/server/services/import";

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, importCommitSchema);
  const db = await getDb();
  const result = await commitImport(db, user.id, input.trades, input.skipDuplicates);
  await logEvent(db, user.id, "import.commit", { inserted: result.inserted, duplicates: result.duplicates }, clientIp(request));
  return json(result, { status: 201 });
});
