-- Backfill legacy launch intent from the previous availability field.
UPDATE "Product"
SET "launchStatus" = 'coming_soon'
WHERE "availability" = 'coming_soon';
