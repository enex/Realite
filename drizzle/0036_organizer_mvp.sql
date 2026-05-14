CREATE TABLE "organizer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"display_name" text,
	"bio" text,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "organizer_profiles_enabled_index" ON "organizer_profiles" USING btree ("enabled");
--> statement-breakpoint

CREATE TABLE "organizer_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"source_path" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizer_analytics_events" ADD CONSTRAINT "organizer_analytics_events_organizer_user_id_users_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organizer_analytics_events" ADD CONSTRAINT "organizer_analytics_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organizer_analytics_events" ADD CONSTRAINT "organizer_analytics_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "organizer_analytics_events_organizer_user_id_created_at_index" ON "organizer_analytics_events" USING btree ("organizer_user_id","created_at");
--> statement-breakpoint
CREATE INDEX "organizer_analytics_events_event_id_metric_index" ON "organizer_analytics_events" USING btree ("event_id","metric");
--> statement-breakpoint
CREATE INDEX "organizer_analytics_events_metric_index" ON "organizer_analytics_events" USING btree ("metric");
