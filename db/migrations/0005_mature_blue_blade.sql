CREATE TABLE "intents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"activity" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"location_preferences" jsonb,
	"time_preferences" jsonb,
	"fulfilled_by_plan_id" uuid,
	"withdrawn_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "intents_user_id_index" ON "intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "intents_activity_index" ON "intents" USING btree ("activity");--> statement-breakpoint
CREATE INDEX "intents_status_index" ON "intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intents_visibility_index" ON "intents" USING btree ("visibility");