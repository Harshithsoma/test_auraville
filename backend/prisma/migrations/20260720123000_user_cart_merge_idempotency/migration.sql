-- CreateTable
CREATE TABLE "public"."UserCartMergeOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mergeId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCartMergeOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCartMergeOperation_userId_mergeId_key" ON "public"."UserCartMergeOperation"("userId", "mergeId");

-- CreateIndex
CREATE INDEX "UserCartMergeOperation_userId_idx" ON "public"."UserCartMergeOperation"("userId");

-- CreateIndex
CREATE INDEX "UserCartMergeOperation_createdAt_idx" ON "public"."UserCartMergeOperation"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."UserCartMergeOperation" ADD CONSTRAINT "UserCartMergeOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
