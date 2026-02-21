ALTER TABLE "user_settings" ADD COLUMN "blocked_creator_ids" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "blocked_activity_tags" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "suggestion_limit_per_day" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "suggestion_limit_per_week" integer DEFAULT 16 NOT NULL;