CREATE TABLE "group_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_contacts" ADD CONSTRAINT "group_contacts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_contacts_group_id_email_index" ON "group_contacts" USING btree ("group_id","email");--> statement-breakpoint
CREATE INDEX "group_contacts_group_id_source_index" ON "group_contacts" USING btree ("group_id","source");