ALTER TABLE "recipes" ADD COLUMN "sort_order" integer;
--> statement-breakpoint
WITH ranked AS (
  SELECT "id", (ROW_NUMBER() OVER (ORDER BY "created_at" DESC) - 1)::integer AS pos
  FROM "recipes"
)
UPDATE "recipes" AS recipes
SET "sort_order" = ranked.pos
FROM ranked
WHERE recipes."id" = ranked."id";
--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "sort_order" SET NOT NULL;
