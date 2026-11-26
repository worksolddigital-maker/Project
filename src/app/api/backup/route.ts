import { todayKey } from "@/lib/domain/dates";
import { restoreBackupSchema } from "@/lib/validation/schemas";
import { getDb } from "@/server/db/client";
import { logEvent } from "@/server/repositories/audit";
import { clientIp, json, readJson, requireUser, route } from "@/server/http";
import { assertPassword } from "@/server/repositories/users";
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
  const input = await readJson(request, restoreBackupSchema);
  const db = await getDb();
  await assertPassword(db, user.id, input.password);
  const restored = await restoreBackup(db, user.id, input.backup);
  await logEvent(db, user.id, "backup.restore", restored, clientIp(request));
  return json({ restored });
});
