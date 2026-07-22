CREATE TABLE "corsair_ai_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'gemini' NOT NULL,
	"model" text DEFAULT 'gemini-3.5-flash' NOT NULL,
	"encrypted_api_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
