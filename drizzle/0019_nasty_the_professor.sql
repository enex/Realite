CREATE TABLE "calendar_watch_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"calendar_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"expiration_ms" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_watch_channels" ADD CONSTRAINT "calendar_watch_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_watch_channels_channel_id_index" ON "calendar_watch_channels" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "calendar_watch_channels_user_id_index" ON "calendar_watch_channels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_watch_channels_expiration_ms_index" ON "calendar_watch_channels" USING btree ("expiration_ms");