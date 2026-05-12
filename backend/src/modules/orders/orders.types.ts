export type OrderItemView = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
};

export type OrderStatusView =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_failed";

export type OrdersListQuery = {
  page: number;
  limit: number;
};

export type OrdersListResponse = {
  data: Array<{
    id: string;
    email: string;
    items: OrderItemView[];
    total: number;
    status: OrderStatusView;
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
    pricing: {
      subtotal: number;
      promoDiscount: number;
      gst: number;
      shipping: number;
      total: number;
    };
    status: OrderStatusView;
    createdAt: string;
  };
};
