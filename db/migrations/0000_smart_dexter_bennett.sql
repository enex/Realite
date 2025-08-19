CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"subject" uuid NOT NULL,
	"actor" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"data" jsonb NOT NULL
);
