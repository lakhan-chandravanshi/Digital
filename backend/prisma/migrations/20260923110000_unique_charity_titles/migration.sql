DELETE FROM "Charity" duplicate
USING "Charity" original
WHERE duplicate."title" = original."title"
  AND duplicate."id" > original."id";

CREATE UNIQUE INDEX "Charity_title_key" ON "Charity"("title");
