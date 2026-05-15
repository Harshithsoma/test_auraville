-- Add variant-level merchandising and pricing fields.
ALTER TABLE "ProductVariant"
ADD COLUMN "compareAtPrice" INTEGER,
ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill compare-at pricing from existing product-level ratio where possible.
UPDATE "ProductVariant" AS pv
SET "compareAtPrice" = CASE
  WHEN p."compareAtPrice" IS NOT NULL
    AND p."compareAtPrice" > p."price"
    AND p."price" > 0
    THEN GREATEST(
      pv."price",
      ROUND((pv."price"::numeric * p."compareAtPrice"::numeric) / p."price"::numeric)::integer
    )
  ELSE pv."price"
END
FROM "Product" AS p
WHERE p."id" = pv."productId"
  AND pv."compareAtPrice" IS NULL;

-- Backfill discount percentage from compare-at and selling price.
UPDATE "ProductVariant"
SET "discountPercent" = CASE
  WHEN "compareAtPrice" IS NOT NULL
    AND "compareAtPrice" > "price"
    AND "compareAtPrice" > 0
    THEN LEAST(
      100,
      GREATEST(
        0,
        ROUND((("compareAtPrice" - "price")::numeric * 100) / "compareAtPrice"::numeric)::integer
      )
    )
  ELSE 0
END;

-- Backfill variant-level featured flags from existing product-level fields.
WITH featured_choice AS (
  SELECT DISTINCT ON (pv."productId")
    pv."id"
  FROM "ProductVariant" AS pv
  JOIN "Product" AS p ON p."id" = pv."productId"
  WHERE p."isFeatured" = true
  ORDER BY
    pv."productId",
    CASE
      WHEN pv."isActive" = true AND pv."stock" > 0 THEN 0
      WHEN pv."isActive" = true THEN 1
      ELSE 2
    END,
    pv."sortOrder" ASC,
    pv."createdAt" ASC
)
UPDATE "ProductVariant" AS pv
SET "isFeatured" = true
FROM featured_choice
WHERE pv."id" = featured_choice."id";

-- Backfill variant-level best-seller flags from existing product-level fields.
WITH bestseller_choice AS (
  SELECT DISTINCT ON (pv."productId")
    pv."id"
  FROM "ProductVariant" AS pv
  JOIN "Product" AS p ON p."id" = pv."productId"
  WHERE p."isBestSeller" = true
  ORDER BY
    pv."productId",
    CASE
      WHEN pv."isActive" = true AND pv."stock" > 0 THEN 0
      WHEN pv."isActive" = true THEN 1
      ELSE 2
    END,
    pv."sortOrder" ASC,
    pv."createdAt" ASC
)
UPDATE "ProductVariant" AS pv
SET "isBestSeller" = true
FROM bestseller_choice
WHERE pv."id" = bestseller_choice."id";

-- Keep legacy product-level projections aligned with variant-level source of truth.
WITH preferred_variant AS (
  SELECT DISTINCT ON (pv."productId")
    pv."productId",
    pv."price",
    pv."compareAtPrice"
  FROM "ProductVariant" AS pv
  ORDER BY
    pv."productId",
    CASE
      WHEN pv."isActive" = true AND pv."stock" > 0 THEN 0
      WHEN pv."isActive" = true THEN 1
      ELSE 2
    END,
    pv."sortOrder" ASC,
    pv."createdAt" ASC
)
UPDATE "Product" AS p
SET
  "price" = preferred_variant."price",
  "compareAtPrice" = CASE
    WHEN preferred_variant."compareAtPrice" IS NOT NULL
      AND preferred_variant."compareAtPrice" > preferred_variant."price"
    THEN preferred_variant."compareAtPrice"
    ELSE NULL
  END,
  "isFeatured" = EXISTS (
    SELECT 1
    FROM "ProductVariant" AS pvf
    WHERE pvf."productId" = p."id"
      AND pvf."isActive" = true
      AND pvf."isFeatured" = true
      AND pvf."stock" > 0
  ),
  "isBestSeller" = EXISTS (
    SELECT 1
    FROM "ProductVariant" AS pvb
    WHERE pvb."productId" = p."id"
      AND pvb."isActive" = true
      AND pvb."isBestSeller" = true
      AND pvb."stock" > 0
  )
FROM preferred_variant
WHERE p."id" = preferred_variant."productId";

CREATE INDEX "ProductVariant_isFeatured_idx" ON "ProductVariant"("isFeatured");
CREATE INDEX "ProductVariant_isBestSeller_idx" ON "ProductVariant"("isBestSeller");
CREATE INDEX "ProductVariant_sortOrder_idx" ON "ProductVariant"("sortOrder");
