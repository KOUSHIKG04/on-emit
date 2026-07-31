-- These application tables are accessed only by trusted server-side routes.
-- They contain email metadata, encrypted BYOK credentials, AI configuration,
-- and Google-account tenant mappings, so PostgREST browser roles must not have
-- direct access.
ALTER TABLE "public"."corsair_email_priorities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."corsair_ai_provider_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."corsair_ai_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."corsair_google_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Keep local/non-Supabase PostgreSQL migrations portable when PostgREST roles
-- are absent. No policies are intentionally created, which leaves normal roles
-- with PostgreSQL's default-deny RLS behavior.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
		EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE
			public.corsair_email_priorities,
			public.corsair_ai_provider_keys,
			public.corsair_ai_settings,
			public.corsair_google_accounts
			FROM anon';
	END IF;

	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
		EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE
			public.corsair_email_priorities,
			public.corsair_ai_provider_keys,
			public.corsair_ai_settings,
			public.corsair_google_accounts
			FROM authenticated';
	END IF;
END
$$;
