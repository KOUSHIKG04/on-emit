CREATE TABLE "corsair_google_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"corsair_tenant_id" text NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "corsair_google_accounts_user_id_idx" ON "corsair_google_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "corsair_google_accounts_active_idx" ON "corsair_google_accounts" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "corsair_google_accounts_tenant_id_unique" ON "corsair_google_accounts" USING btree ("corsair_tenant_id");
--> statement-breakpoint
INSERT INTO "corsair_google_accounts" (
	"id",
	"user_id",
	"corsair_tenant_id",
	"label",
	"is_active"
)
SELECT DISTINCT
	"corsair_accounts"."tenant_id",
	"corsair_accounts"."tenant_id",
	"corsair_accounts"."tenant_id",
	'Primary Google account',
	true
FROM "corsair_accounts"
INNER JOIN "corsair_integrations"
	ON "corsair_integrations"."id" = "corsair_accounts"."integration_id"
WHERE "corsair_integrations"."name" IN ('gmail', 'googlecalendar')
ON CONFLICT ("id") DO NOTHING;
