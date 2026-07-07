-- CreateEnum
CREATE TYPE "ProductLaunchStatus" AS ENUM ('active', 'coming_soon');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "launchStatus" "ProductLaunchStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "Product_launchStatus_idx" ON "Product"("launchStatus");
