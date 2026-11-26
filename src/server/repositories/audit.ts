import "server-only";
import { and, desc, eq, like, not } from "drizzle-orm";
import type { AuditAction, AuditEvent } from "@/lib/security";
import type { Db } from "@/server/db/client";
import { auditEvents } from "@/server/db/schema";

/** Records an event. `detail` is a small JSON object rendered by the client. */
export async function logEvent(db: Db, userId: string, action: AuditAction, detail: Record<string, unknown> = {}, ip = "") {
  await db.insert(auditEvents).values({ userId, action, detail: JSON.stringify(detail).slice(0, 2000), ip: ip.slice(0, 64) });
}

/** `security`: sign-in and password events; `activity`: everything else. */
export async function listEvents(db: Db, userId: string, kind: "security" | "activity", limit = 50): Promise<AuditEvent[]> {
  const byKind = kind === "security" ? like(auditEvents.action, "auth.%") : not(like(auditEvents.action, "auth.%"));
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.userId, userId), byKind))
    .orderBy(desc(auditEvents.createdAt))
    .limit(Math.min(200, Math.max(1, limit)));
  return rows.map((r) => ({
    id: r.id,
    action: r.action as AuditAction,
    detail: r.detail,
    ip: r.ip,
    createdAt: r.createdAt.toISOString(),
  }));
}
