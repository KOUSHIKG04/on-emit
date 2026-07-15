CREATE INDEX "corsair_accounts_tenant_id_idx" ON "corsair_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "corsair_accounts_integration_id_idx" ON "corsair_accounts" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "corsair_entities_account_id_idx" ON "corsair_entities" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "corsair_events_account_id_idx" ON "corsair_events" USING btree ("account_id");