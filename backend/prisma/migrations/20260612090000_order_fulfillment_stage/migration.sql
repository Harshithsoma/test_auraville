-- Add customer-visible fulfillment tracking without changing existing order/payment status semantics.
CREATE TYPE "OrderFulfillmentStage" AS ENUM ('order_placed', 'processing', 'shipped', 'out_for_delivery', 'delivered');

ALTER TABLE "Order"
ADD COLUMN "fulfillmentStage" "OrderFulfillmentStage" NOT NULL DEFAULT 'order_placed';

UPDATE "Order"
SET "fulfillmentStage" = CASE
  WHEN "status" IN ('confirmed', 'packed') THEN 'processing'::"OrderFulfillmentStage"
  WHEN "status" = 'shipped' THEN 'shipped'::"OrderFulfillmentStage"
  WHEN "status" = 'delivered' THEN 'delivered'::"OrderFulfillmentStage"
  ELSE 'order_placed'::"OrderFulfillmentStage"
END;

CREATE INDEX "Order_fulfillmentStage_idx" ON "Order"("fulfillmentStage");
