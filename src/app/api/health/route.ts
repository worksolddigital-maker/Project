import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/server/db/client";
import { json, route } from "@/server/http";

export const GET = route(async () => {
  await connection();
  const db = await getDb();
  await db.execute(sql`select 1`);
  return json({ ok: true, database: process.env.DATABASE_URL ? "postgres" : "pglite" });
});
