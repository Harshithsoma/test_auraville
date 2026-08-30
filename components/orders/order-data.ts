import type {
  CustomerOrderPayment,
  CustomerOrderPricing,
  CustomerShippingAddress
} from "@/components/orders/order-receipt-details";

export type VerifiedReview = {
  reviewId: string;
  rating: number;
  subject: string | null;
  body: string;
};

export type CustomerOrderItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  canRate: boolean;
  verifiedReview: VerifiedReview | null;
};

export type OrderFulfillmentStage =
  | "order_placed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered";

export type CustomerOrder = {
  id: string;
  email: string;
  items: CustomerOrderItem[];
  pricing: CustomerOrderPricing;
  shippingAddress: CustomerShippingAddress;
  payment: CustomerOrderPayment;
  total?: number;
  status: string;
  fulfillmentStage?: OrderFulfillmentStage | null;
  createdAt: string;
};

export type OrdersListResponse = {
  data: CustomerOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type OrderDetailResponse = {
  data: CustomerOrder;
};

export const ORDER_TRACKING_STAGES: Array<{ key: OrderFulfillmentStage; label: string }> = [
  { key: "order_placed", label: "Order Placed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" }
];

export type DerivedTrackingState = {
  stage: OrderFulfillmentStage;
  headline: string;
  isFailed: boolean;
  isStopped: boolean;
};

export function formatOrderDate(createdAt: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(createdAt));
}

export function getOrderItemCount(order: CustomerOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export function getShippingPreview(address: CustomerShippingAddress): string {
  const locality = [address.city, address.state].filter(Boolean).join(", ");
  return [locality, address.pincode].filter(Boolean).join(" - ");
}

export function isPendingOrderExpired(order: CustomerOrder): boolean {
  if (order.status !== "pending") return false;
  const createdAt = new Date(order.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt > 60 * 60 * 1000;
}

export function deriveTrackingState(order: CustomerOrder): DerivedTrackingState {
  if (order.status === "payment_failed" || isPendingOrderExpired(order)) {
    return {
      stage: "order_placed",
      headline: "Payment Failed",
      isFailed: true,
      isStopped: true
    };
  }

  if (order.status === "pending") {
    return {
      stage: "order_placed",
      headline: "Payment Pending",
      isFailed: false,
      isStopped: true
    };
  }

  if (order.status === "cancelled") {
    return {
      stage: "order_placed",
      headline: "Cancelled",
      isFailed: false,
      isStopped: true
    };
  }

  const stageByStatus: Partial<Record<string, OrderFulfillmentStage>> = {
    confirmed: "order_placed",
    packed: "processing",
    shipped: "shipped",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered"
  };
  const stage = stageByStatus[order.status] ?? order.fulfillmentStage ?? "order_placed";
  const currentLabel = ORDER_TRACKING_STAGES.find((item) => item.key === stage)?.label ?? "Order Placed";

  return {
    stage,
    headline: currentLabel,
    isFailed: false,
    isStopped: false
  };
}

export function orderStatusTone(order: CustomerOrder): string {
  const tracking = deriveTrackingState(order);
  if (tracking.isFailed) return "border-[#efb7b0] bg-[#fff4f3] text-[var(--coral)]";
  if (tracking.headline === "Payment Pending") return "border-[#f0d9a2] bg-[#fff9e9] text-[#8a6517]";
  if (tracking.headline === "Cancelled") return "border-[#d8d8d8] bg-[#f5f5f5] text-[#555]";
  if (tracking.stage === "delivered") return "border-[#bfe3c8] bg-[var(--mint)] text-[var(--leaf-deep)]";
  if (tracking.stage === "shipped" || tracking.stage === "out_for_delivery") {
    return "border-[#efd7a1] bg-[#fff9e8] text-[#936513]";
  }
  if (tracking.stage === "processing") return "border-[#cddff5] bg-[#f1f7ff] text-[#285d99]";
  return "border-[var(--line)] bg-white text-[var(--ink-soft)]";
}
