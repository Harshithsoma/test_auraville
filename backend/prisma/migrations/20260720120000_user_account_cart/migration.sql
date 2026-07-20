-- CreateTable
CREATE TABLE "public"."UserCartItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCartItem_userId_productId_variantId_key" ON "public"."UserCartItem"("userId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "UserCartItem_userId_idx" ON "public"."UserCartItem"("userId");

-- CreateIndex
CREATE INDEX "UserCartItem_productId_variantId_idx" ON "public"."UserCartItem"("productId", "variantId");

-- CreateIndex
CREATE INDEX "UserCartItem_updatedAt_idx" ON "public"."UserCartItem"("updatedAt");

-- AddForeignKey
ALTER TABLE "public"."UserCartItem" ADD CONSTRAINT "UserCartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCartItem" ADD CONSTRAINT "UserCartItem_productId_variantId_fkey" FOREIGN KEY ("productId", "variantId") REFERENCES "public"."ProductVariant"("productId", "frontendVariantId") ON DELETE CASCADE ON UPDATE CASCADE;
