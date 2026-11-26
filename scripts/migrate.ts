/**
 * Applies SQL migrations from ./drizzle.
 *   DATABASE_URL=postgres://... npm run db:migrate   -> PostgreSQL / Supabase
 *   npm run db:migrate                               -> embedded PGlite (.data/pglite)
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 1, onnotice: () => {} });
    await migrate(drizzle(client), { migrationsFolder });
    await client.end();
    console.log("Migrations applied to PostgreSQL.");
    return;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite");
  await mkdir(dataDir, { recursive: true });
  const client = await PGlite.create(dataDir);
  await migrate(drizzle(client), { migrationsFolder });
  await client.close();
  console.log(`Migrations applied to embedded database at ${dataDir}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
