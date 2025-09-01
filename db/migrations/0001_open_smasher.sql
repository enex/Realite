CREATE EXTENSION postgis;

CREATE TABLE
	"consumers" (
		"id" uuid PRIMARY KEY NOT NULL,
		"name" text NOT NULL,
		"version" integer NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"plan_locations" (
		"plan_id" uuid NOT NULL,
		"location" geometry (point) NOT NULL,
		"address" text,
		"url" text
	);

--> statement-breakpoint
CREATE TABLE
	"plans" (
		"id" uuid PRIMARY KEY NOT NULL,
		"title" text NOT NULL,
		"description" text,
		"url" text,
		"activity" text NOT NULL,
		"series_id" uuid,
		"created_at" timestamp DEFAULT now () NOT NULL,
		"updated_at" timestamp DEFAULT now () NOT NULL,
		"creator_id" uuid NOT NULL,
		"start_date" timestamp NOT NULL,
		"end_date" timestamp,
		"repetition" jsonb
	);

--> statement-breakpoint
ALTER TABLE "plan_locations" ADD CONSTRAINT "plan_locations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "spatial_index" ON "plan_locations" USING gist ("location");

--> statement-breakpoint
CREATE INDEX "plans_creator_id_index" ON "plans" USING btree ("creator_id");

--> statement-breakpoint
CREATE INDEX "plans_time_range" ON "plans" USING gist (tsrange ("start_date", "end_date"));