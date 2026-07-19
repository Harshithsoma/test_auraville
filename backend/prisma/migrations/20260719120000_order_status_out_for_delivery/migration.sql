-- Additive order workflow status for admin-managed fulfillment.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'out_for_delivery';
