ALTER TABLE "suggestions" ADD COLUMN "decision_reasons" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "suggestions" ADD COLUMN "decision_note" text;