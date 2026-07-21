CREATE TABLE "corsair_email_priorities" (
	"tenant_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"message_id" text NOT NULL,
	"priority" text NOT NULL,
	"reason" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corsair_email_priorities_tenant_id_thread_id_pk" PRIMARY KEY("tenant_id","thread_id")
);
--> statement-breakpoint
CREATE INDEX "corsair_email_priorities_tenant_idx" ON "corsair_email_priorities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "corsair_email_priorities_priority_idx" ON "corsair_email_priorities" USING btree ("tenant_id","priority");