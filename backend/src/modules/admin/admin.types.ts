export type AdminProductAvailability = "available" | "coming-soon";

export type AdminProductVariantResponse = {
  id: string;
  label: string;
  price: number;
  unit: string;
  stock: number;
  sku: string | null;
  isActive: boolean;
};

export type AdminProductResponse = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice: number | null;
  promoLabel: string | null;
  currency: "INR";
  image: string;
  gallery: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  categoryId: string;
  availability: AdminProductAvailability;
  releaseNote: string | null;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  badgeLabel: string | null;
  popularity: number;
  ingredients: string[];
  benefits: string[];
  isActive: boolean;
  variants: AdminProductVariantResponse[];
  createdAt: string;
  updatedAt: string;
};

export type AdminCategoryResponse = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  activeProductCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCouponResponse = {
  id: string;
  code: string;
  type: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewResponse = {
  id: string;
  productId: string | null;
  userId: string | null;
  name: string;
  email: string | null;
  rating: number;
  subject: string | null;
  body: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_failed";

export type AdminOrderItemResponse = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AdminOrderSummaryResponse = {
  id: string;
  status: AdminOrderStatus;
  createdAt: string;
  customer: {
    userId: string | null;
    name: string;
    email: string;
    phone: string;
  };
  pricing: {
    subtotal: number;
    promoDiscount: number;
    gst: number;
    shipping: number;
    total: number;
  };
  payment: {
    status: "created" | "paid" | "failed" | "refunded" | null;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    amount: number | null;
    currency: string | null;
  };
};

export type AdminOrderDetailResponse = AdminOrderSummaryResponse & {
  couponCode: string | null;
  items: AdminOrderItemResponse[];
  shippingAddress: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    pincode: string;
    country: string;
  };
};

export type AdminHomepageSectionResponse = {
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};
