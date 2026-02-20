ALTER TABLE "events" ADD COLUMN "source_provider" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "source_event_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "events_source_provider_source_event_id_index" ON "events" USING btree ("source_provider","source_event_id");