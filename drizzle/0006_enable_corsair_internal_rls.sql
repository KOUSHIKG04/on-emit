-- Corsair stores integration credentials, cached entities, and webhook payloads
-- in these tables. They are server-owned and must not be accessible through
-- Supabase's public PostgREST roles.
ALTER TABLE "public"."corsair_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."corsair_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."corsair_entities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."corsair_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Keep this migration portable for non-Supabase PostgreSQL environments where
-- the PostgREST roles may not exist. No RLS policies are intentionally created:
-- normal database roles therefore receive PostgreSQL's default-deny behavior.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
		EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE
			public.corsair_integrations,
			public.corsair_accounts,
			public.corsair_entities,
			public.corsair_events
			FROM anon';
	END IF;

	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
		EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE
			public.corsair_integrations,
			public.corsair_accounts,
			public.corsair_entities,
			public.corsair_events
			FROM authenticated';
	END IF;
END
$$;
