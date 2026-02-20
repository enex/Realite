UPDATE "groups"
SET "hashtag" = regexp_replace("hashtag", '#öffentlich', '#alle', 'gi')
WHERE "hashtag" ~* '#öffentlich';

--> statement-breakpoint
UPDATE "groups"
SET "name" = '#alle'
WHERE lower("name") = '#öffentlich';

--> statement-breakpoint
DELETE FROM "event_tags" AS old
USING "event_tags" AS normalized
WHERE lower(old."tag") = '#öffentlich'
  AND old."event_id" = normalized."event_id"
  AND normalized."tag" = '#alle';

--> statement-breakpoint
UPDATE "event_tags"
SET "tag" = '#alle'
WHERE lower("tag") = '#öffentlich';

--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "hashtag" SET DEFAULT '#alle';
