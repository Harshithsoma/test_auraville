-- CreateTable
CREATE TABLE "ProductNotifyRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductNotifyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductNotifyRequest_productId_idx" ON "ProductNotifyRequest"("productId");

-- CreateIndex
CREATE INDEX "ProductNotifyRequest_userId_idx" ON "ProductNotifyRequest"("userId");

-- CreateIndex
CREATE INDEX "ProductNotifyRequest_email_idx" ON "ProductNotifyRequest"("email");

-- CreateIndex
CREATE INDEX "ProductNotifyRequest_isActive_idx" ON "ProductNotifyRequest"("isActive");

-- CreateIndex
CREATE INDEX "ProductNotifyRequest_notifiedAt_idx" ON "ProductNotifyRequest"("notifiedAt");

-- CreateIndex
CREATE INDEX "ProductNotifyRequest_requestedAt_idx" ON "ProductNotifyRequest"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductNotifyRequest_productId_email_isActive_key" ON "ProductNotifyRequest"("productId", "email", "isActive");

-- AddForeignKey
ALTER TABLE "ProductNotifyRequest" ADD CONSTRAINT "ProductNotifyRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductNotifyRequest" ADD CONSTRAINT "ProductNotifyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
