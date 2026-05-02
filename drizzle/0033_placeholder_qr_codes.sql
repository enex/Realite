CREATE TABLE "placeholder_qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"owned_by" uuid,
	"singles_slug" text,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "placeholder_qr_codes" ADD CONSTRAINT "placeholder_qr_codes_owned_by_users_id_fk" FOREIGN KEY ("owned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "placeholder_qr_codes_slug_index" ON "placeholder_qr_codes" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "placeholder_qr_codes_owned_by_index" ON "placeholder_qr_codes" USING btree ("owned_by");
