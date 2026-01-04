ALTER TABLE "plans" ADD COLUMN "location" geometry(point);--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "location_address" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "location_title" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "location_url" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "location_description" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "series_index" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "gathering_id" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "open_to" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_participants" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "based_on_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "based_on_user_id" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "status" text DEFAULT 'scheduled';--> statement-breakpoint
CREATE INDEX "plans_location_idx" ON "plans" USING gist ("location");--> statement-breakpoint
CREATE INDEX "plans_series_id_index" ON "plans" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "plans_gathering_id_index" ON "plans" USING btree ("gathering_id");--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "repetition";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "maybe";