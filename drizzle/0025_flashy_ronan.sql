CREATE TYPE "public"."event_join_mode" AS ENUM('direct', 'request', 'interest');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "join_mode" "event_join_mode" DEFAULT 'direct' NOT NULL;