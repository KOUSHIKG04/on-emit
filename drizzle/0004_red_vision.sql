CREATE TABLE "corsair_ai_provider_keys" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corsair_ai_provider_keys_user_id_provider_pk" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
ALTER TABLE "corsair_ai_settings" ADD COLUMN "source" text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
INSERT INTO "corsair_ai_provider_keys" (
	"user_id",
	"provider",
	"encrypted_api_key",
	"created_at",
	"updated_at"
)
SELECT
	"user_id",
	"provider",
	"encrypted_api_key",
	"created_at",
	"updated_at"
FROM "corsair_ai_settings"
WHERE "encrypted_api_key" IS NOT NULL
ON CONFLICT ("user_id", "provider") DO NOTHING;
--> statement-breakpoint
UPDATE "corsair_ai_settings"
SET "source" = 'byok'
WHERE "encrypted_api_key" IS NOT NULL;
