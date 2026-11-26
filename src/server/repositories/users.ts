import "server-only";
import { eq, sql } from "drizzle-orm";
import type { PublicUser } from "@/lib/domain/types";
import type { Db } from "@/server/db/client";
import { userSettings, users } from "@/server/db/schema";
import { ApiError } from "@/server/http";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/server/auth/password";

const toPublic = (r: typeof users.$inferSelect): PublicUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  createdAt: r.createdAt.toISOString(),
});

export async function findUserByEmail(db: Db, email: string) {
  const [row] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${email})`).limit(1);
  return row;
}

export async function registerUser(
  db: Db,
  input: { name: string; email: string; password: string; timezone?: string },
): Promise<PublicUser> {
  if (await findUserByEmail(db, input.email)) {
    throw new ApiError(409, "Este e-mail já está cadastrado.", { email: "Este e-mail já está cadastrado." });
  }
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(users).values({ name: input.name, email: input.email, passwordHash }).returning();
    await tx.insert(userSettings).values({ userId: row.id, ...(input.timezone ? { timezone: input.timezone } : {}) });
    return toPublic(row);
  });
}

/** Returns the user when the credentials match. Timing is equalized for unknown e-mails. */
export async function authenticate(db: Db, email: string, password: string): Promise<PublicUser | null> {
  const row = await findUserByEmail(db, email);
  const ok = await verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
  return row && ok ? toPublic(row) : null;
}

export async function updateProfile(db: Db, userId: string, input: { name: string; email: string }): Promise<PublicUser> {
  const existing = await findUserByEmail(db, input.email);
  if (existing && existing.id !== userId) {
    throw new ApiError(409, "Este e-mail já está em uso.", { email: "Este e-mail já está em uso." });
  }
  const [row] = await db
    .update(users)
    .set({ name: input.name, email: input.email, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return toPublic(row);
}

export async function changePassword(db: Db, userId: string, current: string, next: string): Promise<void> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    throw new ApiError(422, "Senha atual incorreta.", { currentPassword: "Senha atual incorreta." });
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function deleteUser(db: Db, userId: string, password: string): Promise<void> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    throw new ApiError(422, "Senha incorreta.", { password: "Senha incorreta." });
  }
  await db.delete(users).where(eq(users.id, userId));
}
