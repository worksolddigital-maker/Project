import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Database access.
 *
 * - With DATABASE_URL set, connects to PostgreSQL (Supabase, Neon, RDS, local…).
 *   Migrations run with `npm run db:migrate`, or automatically when DB_AUTO_MIGRATE=true.
 * - Without it, uses an embedded PostgreSQL (PGlite) persisted on disk in
 *   PGLITE_DATA_DIR (default `.data/pglite`) and migrates automatically.
 *
 * Both drivers share the same Drizzle schema and query API.
 */
export type Db = PostgresJsDatabase<typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

declare global {
  var __tradingDeskDb: Promise<Db> | undefined;
}

async function createPostgres(url: string): Promise<Db> {
  const [{ default: postgres }, { drizzle }] = await Promise.all([import("postgres"), import("drizzle-orm/postgres-js")]);
  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: process.env.DATABASE_PREPARE === "true",
    onnotice: () => {},
  });
  const db = drizzle(client, { schema });
  if (process.env.DB_AUTO_MIGRATE === "true") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }
  return db;
}

async function createPglite(): Promise<Db> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (dataDir !== "memory://") await mkdir(dataDir, { recursive: true });
  const client = await PGlite.create(dataDir === "memory://" ? undefined : dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__tradingDeskDb) {
    const url = process.env.DATABASE_URL;
    globalThis.__tradingDeskDb = (url ? createPostgres(url) : createPglite()).catch((err) => {
      globalThis.__tradingDeskDb = undefined;
      throw err;
    });
  }
  return globalThis.__tradingDeskDb;
}

export { schema };
