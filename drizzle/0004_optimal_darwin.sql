ALTER TABLE "groups" ADD COLUMN "sync_provider" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "sync_reference" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "groups_sync_provider_sync_reference_created_by_index" ON "groups" USING btree ("sync_provider","sync_reference","created_by");
