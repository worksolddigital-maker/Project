-- Defense in depth for hosted Postgres (e.g. Supabase): tables in the public schema
-- are reachable through the platform's REST/GraphQL APIs. Enabling RLS without
-- policies denies every API role; the application connects as the table owner,
-- which bypasses RLS, so the app itself is unaffected.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "strategies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cash_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
