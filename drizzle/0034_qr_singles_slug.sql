ALTER TABLE "placeholder_qr_codes" DROP CONSTRAINT "placeholder_qr_codes_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "placeholder_qr_codes" DROP COLUMN "event_id";
--> statement-breakpoint
ALTER TABLE "placeholder_qr_codes" ADD COLUMN "singles_slug" text;
