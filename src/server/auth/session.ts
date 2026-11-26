import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, lt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { SECURITY_POLICY, type SessionInfo } from "@/lib/security";
import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";

export const SESSION_COOKIE = "td_session";
const SESSION_TTL_MS = SECURITY_POLICY.sessionDays * 24 * 3600 * 1000;
const IDLE_MS = SECURITY_POLICY.idleMinutes * 60 * 1000;
const TOUCH_EVERY_MS = 60 * 1000;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  sessionId: string;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSession(userId: string, userAgent: string, ip: string): Promise<void> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, userAgent: userAgent.slice(0, 300), ip: ip.slice(0, 64) });
  // Opportunistic cleanup of expired and idle sessions.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(sessions).where(lt(sessions.lastSeenAt, new Date(Date.now() - IDLE_MS)));
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/**
 * The signed-in person, or null. Sessions end after SECURITY_POLICY.idleMinutes
 * without activity or SECURITY_POLICY.sessionDays after login, whichever comes first.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const id = hashToken(token);
  const now = Date.now();
  const rows = await db
    .select({
      sessionId: sessions.id,
      lastSeenAt: sessions.lastSeenAt,
      id: users.id,
      name: users.name,
      email: users.email,
      lastLoginAt: users.lastLoginAt,
      passwordChangedAt: users.passwordChangedAt,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date(now))))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.lastSeenAt.getTime() < now - IDLE_MS) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (now - row.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date(now) }).where(eq(sessions.id, id));
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    passwordChangedAt: row.passwordChangedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    sessionId: row.sessionId,
  };
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function listSessions(userId: string, currentId: string): Promise<SessionInfo[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date()), gt(sessions.lastSeenAt, new Date(Date.now() - IDLE_MS))))
    .orderBy(desc(sessions.lastSeenAt));
  return rows.map((r) => ({
    // Never expose the token hash itself: a short fingerprint identifies the row.
    id: r.id.slice(0, 16),
    userAgent: r.userAgent,
    ip: r.ip,
    createdAt: r.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    current: r.id === currentId,
  }));
}

export async function destroySessionByFingerprint(userId: string, fingerprint: string, currentId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
  const target = rows.find((r) => r.id.slice(0, 16) === fingerprint && r.id !== currentId);
  if (!target) return false;
  await db.delete(sessions).where(eq(sessions.id, target.id));
  return true;
}

export async function destroyOtherSessions(userId: string, keepSessionId: string): Promise<number> {
  const db = await getDb();
  const deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)))
    .returning({ id: sessions.id });
  return deleted.length;
}
