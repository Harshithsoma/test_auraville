import type { CartPriceItemInput } from "../cart/cart.types";

export type CheckoutOrderRequest = {
  items: CartPriceItemInput[];
  promoCode?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    pincode: string;
    country?: string;
  };
};

export type CheckoutOrderResponse = {
  data: {
    order: {
      id: string;
      email: string;
      items: Array<{
        productId: string;
        slug: string;
        name: string;
        image: string;
        variantId: string;
        variantLabel: string;
        unitPrice: number;
        quantity: number;
      }>;
      total: number;
      status: "pending";
      createdAt: string;
    };
    pricing: {
      subtotal: number;
      promoDiscount: number;
      gst: number;
      shipping: number;
      total: number;
    };
    razorpay: {
      keyId: string;
      orderId: string;
      amount: number;
      currency: "INR";
      name: "Auraville";
      description: string;
    };
  };
};
