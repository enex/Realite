CREATE TYPE "public"."dating_gender" AS ENUM('woman', 'man', 'non_binary');--> statement-breakpoint
ALTER TYPE "public"."event_visibility" ADD VALUE 'smart_date';--> statement-breakpoint
CREATE TABLE "dating_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"birth_year" integer,
	"gender" "dating_gender",
	"is_single" boolean DEFAULT false NOT NULL,
	"sought_genders" text DEFAULT '' NOT NULL,
	"sought_age_min" integer,
	"sought_age_max" integer,
	"sought_only_singles" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dating_profiles" ADD CONSTRAINT "dating_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dating_profiles_gender_index" ON "dating_profiles" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "dating_profiles_enabled_index" ON "dating_profiles" USING btree ("enabled");--> statement-breakpoint
UPDATE "event_tags"
SET "tag" = '#date'
WHERE lower("tag") = '#dating';
