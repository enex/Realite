ALTER TABLE "event_presences" ADD COLUMN "visible_until" timestamp with time zone;
UPDATE "event_presences"
SET "visible_until" = CASE
  WHEN "status" = 'checked_in' THEN "updated_at" + interval '2 hours'
  ELSE "updated_at"
END;
ALTER TABLE "event_presences" ALTER COLUMN "visible_until" SET NOT NULL;
