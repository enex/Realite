ALTER TYPE "public"."event_visibility" ADD VALUE 'friends' BEFORE 'smart_date';--> statement-breakpoint
ALTER TYPE "public"."event_visibility" ADD VALUE 'friends_of_friends' BEFORE 'smart_date';