import { todayKey } from "@/lib/domain/dates";
import { backupSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { json, readJson, requireUser, route } from "@/server/http";
import { exportBackup, restoreBackup } from "@/server/services/backup";

export const GET = route(async () => {
  const user = await requireUser();
  const backup = await exportBackup(await getDb(), user.id);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup_trading_${todayKey(backup.settings.timezone)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const backup = await readJson(request, backupSchema);
  const restored = await restoreBackup(await getDb(), user.id, backup);
  return json({ restored });
});
