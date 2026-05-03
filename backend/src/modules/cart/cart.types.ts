export type CartPriceItemInput = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type CartPriceRequest = {
  items: CartPriceItemInput[];
  promoCode?: string;
};

export type CartPriceResponseItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  compareAtUnitPrice: number;
  quantity: number;
  lineTotal: number;
  available: boolean;
  stock: number;
};

export type CartPriceSummary = {
  originalSubtotal: number;
  subtotal: number;
  baseSavings: number;
  promoCode: string | null;
  promoDiscount: number;
  discountedSubtotal: number;
  gst: number;
  shipping: number;
  total: number;
  totalSavings: number;
  freeShippingThreshold: number;
  remainingForFreeShipping: number;
};

export type CartPriceResponse = {
  data: {
    items: CartPriceResponseItem[];
    summary: CartPriceSummary;
  };
};
