ALTER TABLE "placeholder_qr_codes" RENAME COLUMN "event_id" TO "singles_slug";--> statement-breakpoint
ALTER TABLE "placeholder_qr_codes" DROP CONSTRAINT "placeholder_qr_codes_event_id_events_id_fk";
