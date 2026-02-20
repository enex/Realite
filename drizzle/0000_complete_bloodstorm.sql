CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM ('public', 'group');

--> statement-breakpoint
CREATE TYPE "public"."group_role" AS ENUM ('owner', 'member');

--> statement-breakpoint
CREATE TYPE "public"."group_visibility" AS ENUM ('public', 'private');

--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM (
	'pending',
	'calendar_inserted',
	'accepted',
	'declined'
);

--> statement-breakpoint
CREATE TABLE
	"calendar_connections" (
		"user_id" uuid NOT NULL,
		"provider" text DEFAULT 'google' NOT NULL,
		"access_token" text NOT NULL,
		"refresh_token" text,
		"token_expires_at" timestamp
		with
			time zone,
			"scope" text,
			"created_at" timestamp
		with
			time zone DEFAULT now () NOT NULL,
			"updated_at" timestamp
		with
			time zone DEFAULT now () NOT NULL,
			CONSTRAINT "calendar_connections_user_id_provider_pk" PRIMARY KEY ("user_id", "provider")
	);

--> statement-breakpoint
CREATE TABLE
	"event_tags" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"event_id" uuid NOT NULL,
		"tag" text NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"events" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"title" text NOT NULL,
		"description" text,
		"location" text,
		"starts_at" timestamp
		with
			time zone NOT NULL,
			"ends_at" timestamp
		with
			time zone NOT NULL,
			"visibility" "event_visibility" DEFAULT 'public' NOT NULL,
			"group_id" uuid,
			"created_by" uuid NOT NULL,
			"created_at" timestamp
		with
			time zone DEFAULT now () NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"group_memberships" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"group_id" uuid NOT NULL,
		"user_id" uuid NOT NULL,
		"role" "group_role" DEFAULT 'member' NOT NULL,
		"created_at" timestamp
		with
			time zone DEFAULT now () NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"groups" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"name" text NOT NULL,
		"description" text,
		"visibility" "group_visibility" DEFAULT 'private' NOT NULL,
		"created_by" uuid NOT NULL,
		"created_at" timestamp
		with
			time zone DEFAULT now () NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"invite_links" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"group_id" uuid NOT NULL,
		"token" text NOT NULL,
		"created_by" uuid NOT NULL,
		"expires_at" timestamp
		with
			time zone NOT NULL,
			"created_at" timestamp
		with
			time zone DEFAULT now () NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"suggestions" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"user_id" uuid NOT NULL,
		"event_id" uuid NOT NULL,
		"score" real NOT NULL,
		"reason" text NOT NULL,
		"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
		"calendar_event_id" text,
		"created_at" timestamp
		with
			time zone DEFAULT now () NOT NULL,
			"updated_at" timestamp
		with
			time zone DEFAULT now () NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"tag_preferences" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"user_id" uuid NOT NULL,
		"tag" text NOT NULL,
		"weight" real DEFAULT 0 NOT NULL,
		"votes" integer DEFAULT 0 NOT NULL,
		"updated_at" timestamp
		with
			time zone DEFAULT now () NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"users" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"email" text NOT NULL,
		"name" text,
		"image" text,
		"created_at" timestamp
		with
			time zone DEFAULT now () NOT NULL,
			"updated_at" timestamp
		with
			time zone DEFAULT now () NOT NULL
	);

--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups" ("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "tag_preferences" ADD CONSTRAINT "tag_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "calendar_connections_provider_index" ON "calendar_connections" USING btree ("provider");

--> statement-breakpoint
CREATE UNIQUE INDEX "event_tags_event_id_tag_index" ON "event_tags" USING btree ("event_id", "tag");

--> statement-breakpoint
CREATE INDEX "events_starts_at_index" ON "events" USING btree ("starts_at");

--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_group_id_user_id_index" ON "group_memberships" USING btree ("group_id", "user_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "invite_links_token_index" ON "invite_links" USING btree ("token");

--> statement-breakpoint
CREATE UNIQUE INDEX "suggestions_user_id_event_id_index" ON "suggestions" USING btree ("user_id", "event_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "tag_preferences_user_id_tag_index" ON "tag_preferences" USING btree ("user_id", "tag");

--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_index" ON "users" USING btree ("email");