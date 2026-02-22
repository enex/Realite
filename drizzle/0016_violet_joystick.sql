CREATE TYPE "public"."smart_meeting_plan_status" AS ENUM('active', 'secured', 'exhausted', 'paused');--> statement-breakpoint
CREATE TYPE "public"."smart_meeting_response" AS ENUM('accepted', 'declined', 'no_response');--> statement-breakpoint
CREATE TYPE "public"."smart_meeting_run_status" AS ENUM('pending', 'secured', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "smart_meeting_member_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"email" text NOT NULL,
	"registered_user_id" uuid,
	"accept_count" integer DEFAULT 0 NOT NULL,
	"decline_count" integer DEFAULT 0 NOT NULL,
	"no_response_count" integer DEFAULT 0 NOT NULL,
	"last_response" "smart_meeting_response",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_meeting_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"tags" text DEFAULT '' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"min_accepted_participants" integer NOT NULL,
	"response_window_hours" integer DEFAULT 24 NOT NULL,
	"slot_interval_minutes" integer DEFAULT 30 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"search_window_start" timestamp with time zone NOT NULL,
	"search_window_end" timestamp with time zone NOT NULL,
	"status" "smart_meeting_plan_status" DEFAULT 'active' NOT NULL,
	"latest_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_meeting_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"event_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"response_deadline_at" timestamp with time zone NOT NULL,
	"calendar_event_id" text,
	"invited_emails" text DEFAULT '' NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"declined_count" integer DEFAULT 0 NOT NULL,
	"pending_count" integer DEFAULT 0 NOT NULL,
	"status" "smart_meeting_run_status" DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smart_meeting_member_stats" ADD CONSTRAINT "smart_meeting_member_stats_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_meeting_member_stats" ADD CONSTRAINT "smart_meeting_member_stats_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_meeting_member_stats" ADD CONSTRAINT "smart_meeting_member_stats_registered_user_id_users_id_fk" FOREIGN KEY ("registered_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_meeting_plans" ADD CONSTRAINT "smart_meeting_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_meeting_plans" ADD CONSTRAINT "smart_meeting_plans_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_meeting_runs" ADD CONSTRAINT "smart_meeting_runs_plan_id_smart_meeting_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."smart_meeting_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_meeting_runs" ADD CONSTRAINT "smart_meeting_runs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "smart_meeting_member_stats_owner_user_id_group_id_email_index" ON "smart_meeting_member_stats" USING btree ("owner_user_id","group_id","email");--> statement-breakpoint
CREATE INDEX "smart_meeting_member_stats_owner_user_id_group_id_index" ON "smart_meeting_member_stats" USING btree ("owner_user_id","group_id");--> statement-breakpoint
CREATE INDEX "smart_meeting_member_stats_registered_user_id_index" ON "smart_meeting_member_stats" USING btree ("registered_user_id");--> statement-breakpoint
CREATE INDEX "smart_meeting_plans_created_by_index" ON "smart_meeting_plans" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "smart_meeting_plans_group_id_index" ON "smart_meeting_plans" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "smart_meeting_plans_status_index" ON "smart_meeting_plans" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "smart_meeting_runs_plan_id_attempt_index" ON "smart_meeting_runs" USING btree ("plan_id","attempt");--> statement-breakpoint
CREATE INDEX "smart_meeting_runs_plan_id_index" ON "smart_meeting_runs" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "smart_meeting_runs_status_index" ON "smart_meeting_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "smart_meeting_runs_response_deadline_at_index" ON "smart_meeting_runs" USING btree ("response_deadline_at");