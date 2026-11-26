import "server-only";
import { eq, sql } from "drizzle-orm";
import type { PublicUser } from "@/lib/domain/types";
import { passwordContainsName, SECURITY_POLICY } from "@/lib/security";
import type { Db } from "@/server/db/client";
import { userSettings, users } from "@/server/db/schema";
import { ApiError } from "@/server/http";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/server/auth/password";
import { logEvent } from "./audit";

export { passwordContainsName };

type UserRow = typeof users.$inferSelect;

const toPublic = (r: UserRow): PublicUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
  passwordChangedAt: r.passwordChangedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export async function findUserByEmail(db: Db, email: string) {
  const [row] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${email})`).limit(1);
  return row;
}

const nameInPassword = () => new ApiError(422, "A senha não pode conter o seu nome.", { password: "A senha não pode conter o seu nome." });

export async function registerUser(
  db: Db,
  input: { name: string; email: string; password: string; timezone?: string },
  ip = "",
): Promise<PublicUser> {
  if (await findUserByEmail(db, input.email)) {
    throw new ApiError(409, "Este e-mail já está cadastrado.", { email: "Este e-mail já está cadastrado." });
  }
  if (passwordContainsName(input.password, input.name)) throw nameInPassword();
  const passwordHash = await hashPassword(input.password);
  const user = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(users)
      .values({ name: input.name, email: input.email, passwordHash, passwordChangedAt: new Date(), lastLoginAt: new Date() })
      .returning();
    await tx.insert(userSettings).values({ userId: row.id, ...(input.timezone ? { timezone: input.timezone } : {}) });
    return toPublic(row);
  });
  await logEvent(db, user.id, "auth.register", {}, ip);
  return user;
}

const minutesLeft = (until: Date) => Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));

/**
 * Checks the credentials. After SECURITY_POLICY.maxFailedLogins wrong passwords
 * in a row the account is locked for SECURITY_POLICY.lockMinutes. Every outcome
 * is written to the account's security log. Unknown e-mails take the same time.
 */
export async function authenticate(db: Db, email: string, password: string, ip = ""): Promise<PublicUser> {
  const row = await findUserByEmail(db, email);
  if (!row) {
    await verifyPassword(password, DUMMY_HASH);
    throw new ApiError(401, "E-mail ou senha incorretos.");
  }
  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    throw new ApiError(423, `Conta bloqueada por segurança. Tente novamente em ${minutesLeft(row.lockedUntil)} min.`);
  }
  if (!(await verifyPassword(password, row.passwordHash))) {
    const failed = row.failedLoginCount + 1;
    if (failed >= SECURITY_POLICY.maxFailedLogins) {
      const lockedUntil = new Date(Date.now() + SECURITY_POLICY.lockMinutes * 60000);
      await db.update(users).set({ failedLoginCount: 0, lockedUntil }).where(eq(users.id, row.id));
      await logEvent(db, row.id, "auth.locked", { attempts: failed }, ip);
      throw new ApiError(423, `Senha incorreta. Conta bloqueada por ${SECURITY_POLICY.lockMinutes} minutos.`);
    }
    await db.update(users).set({ failedLoginCount: failed }).where(eq(users.id, row.id));
    await logEvent(db, row.id, "auth.login_failed", { attempts: failed }, ip);
    throw new ApiError(401, "E-mail ou senha incorretos.");
  }
  const [updated] = await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, row.id))
    .returning();
  await logEvent(db, row.id, "auth.login", {}, ip);
  return toPublic(updated);
}

/** Re-authentication for sensitive actions. */
export async function assertPassword(db: Db, userId: string, password: string): Promise<void> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    throw new ApiError(422, "Senha incorreta.", { password: "Senha incorreta." });
  }
}

export async function getPublicUser(db: Db, userId: string): Promise<PublicUser> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) throw new ApiError(404, "Conta não encontrada.");
  return toPublic(row);
}

export async function updateProfile(db: Db, userId: string, input: { name: string; email: string }, ip = ""): Promise<PublicUser> {
  const existing = await findUserByEmail(db, input.email);
  if (existing && existing.id !== userId) {
    throw new ApiError(409, "Este e-mail já está em uso.", { email: "Este e-mail já está em uso." });
  }
  const [row] = await db
    .update(users)
    .set({ name: input.name, email: input.email, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  await logEvent(db, userId, "profile.update", {}, ip);
  return toPublic(row);
}

export async function changePassword(db: Db, userId: string, current: string, next: string, ip = ""): Promise<void> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    throw new ApiError(422, "Senha atual incorreta.", { currentPassword: "Senha atual incorreta." });
  }
  if (passwordContainsName(next, row.name)) {
    throw new ApiError(422, "A senha não pode conter o seu nome.", { newPassword: "A senha não pode conter o seu nome." });
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await logEvent(db, userId, "auth.password_changed", {}, ip);
}

export async function deleteUser(db: Db, userId: string, password: string): Promise<void> {
  await assertPassword(db, userId, password);
  await db.delete(users).where(eq(users.id, userId));
}
