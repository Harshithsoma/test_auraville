-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "orderItemId" TEXT;

-- CreateTable
CREATE TABLE "ReviewRequestToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "suggestedRating" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRequestToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequestToken_tokenHash_key" ON "ReviewRequestToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ReviewRequestToken_userId_idx" ON "ReviewRequestToken"("userId");

-- CreateIndex
CREATE INDEX "ReviewRequestToken_productId_idx" ON "ReviewRequestToken"("productId");

-- CreateIndex
CREATE INDEX "ReviewRequestToken_orderId_idx" ON "ReviewRequestToken"("orderId");

-- CreateIndex
CREATE INDEX "ReviewRequestToken_orderItemId_idx" ON "ReviewRequestToken"("orderItemId");

-- CreateIndex
CREATE INDEX "ReviewRequestToken_expiresAt_idx" ON "ReviewRequestToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ReviewRequestToken_usedAt_idx" ON "ReviewRequestToken"("usedAt");

-- CreateIndex
CREATE INDEX "Review_isVerifiedPurchase_idx" ON "Review"("isVerifiedPurchase");

-- CreateIndex
CREATE INDEX "Review_orderId_idx" ON "Review"("orderId");

-- CreateIndex
CREATE INDEX "Review_orderItemId_idx" ON "Review"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequestToken" ADD CONSTRAINT "ReviewRequestToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequestToken" ADD CONSTRAINT "ReviewRequestToken_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequestToken" ADD CONSTRAINT "ReviewRequestToken_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequestToken" ADD CONSTRAINT "ReviewRequestToken_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

