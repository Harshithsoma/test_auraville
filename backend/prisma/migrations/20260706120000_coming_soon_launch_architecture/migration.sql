CREATE TYPE "ProductLaunchStatus" AS ENUM ('active', 'coming_soon');

ALTER TABLE "Product"
  ADD COLUMN "launchStatus" "ProductLaunchStatus" NOT NULL DEFAULT 'active';

UPDATE "Product"
SET "launchStatus" = 'coming_soon'
WHERE "availability" = 'coming_soon';

UPDATE "Product"
SET "isFeatured" = false,
    "isBestSeller" = false
WHERE "launchStatus" = 'coming_soon';

UPDATE "ProductVariant"
SET "isFeatured" = false,
    "isBestSeller" = false
WHERE "productId" IN (
  SELECT "id" FROM "Product" WHERE "launchStatus" = 'coming_soon'
);

CREATE INDEX "Product_launchStatus_idx" ON "Product"("launchStatus");

-- Authenticated users should have at most one active Notify Me request per product.
-- Keep the existing product/email uniqueness for backward compatibility with older and guest-originated records.
WITH ranked_active_user_requests AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "productId", "userId"
      ORDER BY "requestedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "ProductNotifyRequest"
  WHERE "userId" IS NOT NULL
    AND "isActive" = true
)
UPDATE "ProductNotifyRequest"
SET "isActive" = false
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_user_requests
  WHERE row_number > 1
);

CREATE INDEX "ProductNotifyRequest_productId_userId_isActive_idx"
  ON "ProductNotifyRequest"("productId", "userId", "isActive");

CREATE UNIQUE INDEX "ProductNotifyRequest_active_user_product_key"
  ON "ProductNotifyRequest"("productId", "userId")
  WHERE "userId" IS NOT NULL AND "isActive" = true;
