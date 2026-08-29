export type OrderItemView = {
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
  verifiedReview: {
    reviewId: string;
    rating: number;
    subject: string | null;
    body: string;
  } | null;
};

export type OrderStatusView =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "payment_failed";

export type OrderFulfillmentStageView =
  | "order_placed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered";

export type PaymentStatusView = "created" | "paid" | "failed" | "refunded";

export type CustomerOrderPricingView = {
  originalSubtotal: number;
  subtotal: number;
  baseSavings: number;
  couponCode: string | null;
  couponDiscount: number;
  promoDiscount: number;
  gst: number;
  shipping: number;
  total: number;
};

export type CustomerShippingAddressView = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  pincode: string;
  country: string;
};

export type CustomerOrderPaymentView = {
  provider: "Razorpay";
  status: PaymentStatusView;
} | null;

export type OrdersListQuery = {
  page: number;
  limit: number;
};

export type OrdersListResponse = {
  data: Array<{
    id: string;
    email: string;
    items: OrderItemView[];
    pricing: CustomerOrderPricingView;
    shippingAddress: CustomerShippingAddressView;
    payment: CustomerOrderPaymentView;
    total: number;
    status: OrderStatusView;
    fulfillmentStage: OrderFulfillmentStageView;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type OrderDetailResponse = {
  data: {
    id: string;
    email: string;
    items: OrderItemView[];
    pricing: CustomerOrderPricingView;
    shippingAddress: CustomerShippingAddressView;
    payment: CustomerOrderPaymentView;
    status: OrderStatusView;
    fulfillmentStage: OrderFulfillmentStageView;
    createdAt: string;
  };
};
