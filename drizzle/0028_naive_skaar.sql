CREATE TYPE "public"."event_presence_status" AS ENUM('checked_in', 'left');--> statement-breakpoint
CREATE TABLE "event_presences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "event_presence_status" DEFAULT 'checked_in' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_presences" ADD CONSTRAINT "event_presences_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_presences" ADD CONSTRAINT "event_presences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_presences_event_id_user_id_index" ON "event_presences" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_presences_event_id_status_index" ON "event_presences" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_presences_user_id_status_index" ON "event_presences" USING btree ("user_id","status");