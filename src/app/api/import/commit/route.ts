import { importCommitSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { json, readJson, requireUser, route } from "@/server/http";
import { commitImport } from "@/server/services/import";

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, importCommitSchema);
  const result = await commitImport(await getDb(), user.id, input.trades, input.skipDuplicates);
  return json(result, { status: 201 });
});
