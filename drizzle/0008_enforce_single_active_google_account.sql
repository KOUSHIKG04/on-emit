WITH ranked_active_accounts AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "user_id"
			ORDER BY "updated_at" DESC, "created_at" ASC, "id" ASC
		) AS "active_rank"
	FROM "corsair_google_accounts"
	WHERE "is_active" = true
)
UPDATE "corsair_google_accounts"
SET "is_active" = false,
	"updated_at" = now()
FROM ranked_active_accounts
WHERE "corsair_google_accounts"."id" = ranked_active_accounts."id"
	AND ranked_active_accounts."active_rank" > 1;
--> statement-breakpoint
DROP INDEX IF EXISTS "corsair_google_accounts_active_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "corsair_google_accounts_active_idx"
	ON "corsair_google_accounts" USING btree ("user_id")
	WHERE "is_active" = true;
