CREATE TABLE "intent_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"activity" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"response_message" text,
	"plan_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "intent_requests_to_user_id_index" ON "intent_requests" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "intent_requests_from_user_id_index" ON "intent_requests" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "intent_requests_status_index" ON "intent_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intent_requests_activity_index" ON "intent_requests" USING btree ("activity");