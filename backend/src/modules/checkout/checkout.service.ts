import { env } from "../../config/env";
import { createRazorpayOrder } from "../../config/razorpay";
import { prisma } from "../../prisma/prisma.service";
import { FREE_SHIPPING_THRESHOLD, GST_RATE, SHIPPING_FEE } from "../../utils/pricing";
import type { AuthenticatedUser } from "../../middleware/auth.middleware";
import { HttpError } from "../../utils/http-error";
import {
  enrichCartItems,
  normalizePromoCode,
  validateAndCalculateCoupon,
  type ValidatedCartItem
} from "../cart/cart.shared";
import type { CheckoutOrderRequest, CheckoutOrderResponse } from "./checkout.types";

function generateOrderId(): string {
  const epochSuffix = Date.now().toString().slice(-8);
  const randomSuffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `AUR-${epochSuffix}${randomSuffix}`;
}

async function createUniqueOrderId(maxAttempts = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateOrderId();
    const exists = await prisma.order.findUnique({ where: { id: candidate }, select: { id: true } });
    if (!exists) {
      return candidate;
    }
  }

  throw new HttpError(500, "Unable to create order id");
}

function buildCartSignature(items: ValidatedCartItem[]): string {
  return items
    .map((item) => `${item.productId}:${item.variantId}:${item.quantity}:${item.unitPrice}`)
    .sort()
    .join("|");
}

function buildOrderResponse(params: {
  order: {
    id: string;
    email: string;
    status: "pending";
    createdAt: Date;
    total: number;
  };
  items: ValidatedCartItem[];
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
    description: string;
  };
}): CheckoutOrderResponse {
  return {
    data: {
      order: {
        id: params.order.id,
        email: params.order.email,
        items: params.items.map((item) => ({
          productId: item.productId,
          slug: item.slug,
          name: item.name,
          image: item.image,
          variantId: item.variantId,
          variantLabel: item.variantLabel,
          unitPrice: item.unitPrice,
          quantity: item.quantity
        })),
        total: params.order.total,
        status: params.order.status,
        createdAt: params.order.createdAt.toISOString()
      },
      pricing: params.pricing,
      razorpay: {
        keyId: params.razorpay.keyId,
        orderId: params.razorpay.orderId,
        amount: params.razorpay.amount,
        currency: params.razorpay.currency,
        name: "Auraville",
        description: params.razorpay.description
      }
    }
  };
}

type RecentDuplicateOrderCandidate = {
  id: string;
  email: string;
  couponCode: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  pincode: string;
  country: string;
  total: number;
  createdAt: Date;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
  }>;
  payment: {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    status: "created" | "paid" | "failed" | "refunded";
  } | null;
};

export async function createCheckoutOrder(params: {
  payload: CheckoutOrderRequest;
  authUser?: AuthenticatedUser;
}): Promise<CheckoutOrderResponse> {
  const { payload, authUser } = params;

  const normalizedPromoCode = normalizePromoCode(payload.promoCode);
  const validatedItems = await enrichCartItems(payload.items);

  const subtotal = validatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const originalSubtotal = validatedItems.reduce(
    (sum, item) => sum + item.compareAtUnitPrice * item.quantity,
    0
  );
  const baseSavings = Math.max(0, originalSubtotal - subtotal);

  let promoDiscount = 0;
  let appliedPromoCode: string | null = null;

  if (normalizedPromoCode) {
    const couponResult = await validateAndCalculateCoupon({
      code: normalizedPromoCode,
      subtotal,
      context: {
        userId: authUser?.id,
        email: payload.customer.email
      }
    });

    promoDiscount = couponResult.discountAmount;
    appliedPromoCode = couponResult.code;
  }

  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  const gst = Math.round(discountedSubtotal * GST_RATE);
  const shipping =
    discountedSubtotal === 0 || discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = discountedSubtotal + gst + shipping;

  const pricing = {
    subtotal,
    promoDiscount,
    gst,
    shipping,
    total
  };

  const recentCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const incomingSignature = buildCartSignature(validatedItems);

  const recentOrders = await prisma.order.findMany({
    where: {
      email: payload.customer.email,
      status: "pending",
      createdAt: {
        gte: recentCutoff
      }
    },
    include: {
      items: {
        select: {
          productId: true,
          variantId: true,
          quantity: true,
          unitPrice: true
        }
      },
      payment: {
        select: {
          razorpayOrderId: true,
          amount: true,
          currency: true,
          status: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 5
  });

  const duplicate = (recentOrders as RecentDuplicateOrderCandidate[]).find((order) => {
    if (!order.payment || order.payment.status !== "created") return false;
    if (order.total !== total || order.couponCode !== appliedPromoCode) return false;
    if (order.addressLine1 !== payload.shippingAddress.addressLine1) return false;
    if ((order.addressLine2 ?? "") !== (payload.shippingAddress.addressLine2 ?? "")) return false;
    if (order.city !== payload.shippingAddress.city) return false;
    if ((order.state ?? "") !== (payload.shippingAddress.state ?? "")) return false;
    if (order.pincode !== payload.shippingAddress.pincode) return false;
    if (order.country !== (payload.shippingAddress.country ?? "India")) return false;

    const existingSignature = order.items
      .map(
        (item: { productId: string; variantId: string; quantity: number; unitPrice: number }) =>
          `${item.productId}:${item.variantId}:${item.quantity}:${item.unitPrice}`
      )
      .sort()
      .join("|");

    return existingSignature === incomingSignature;
  });

  if (duplicate && duplicate.payment) {
    return buildOrderResponse({
      order: {
        id: duplicate.id,
        email: duplicate.email,
        status: "pending",
        createdAt: duplicate.createdAt,
        total: duplicate.total
      },
      items: validatedItems,
      pricing,
      razorpay: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: duplicate.payment.razorpayOrderId,
        amount: duplicate.payment.amount,
        currency: "INR",
        description: `Auraville order ${duplicate.id}`
      }
    });
  }

  const orderId = await createUniqueOrderId();
  const amountInPaise = total * 100;

  const razorpayOrder = await createRazorpayOrder({
    amountInPaise,
    currency: "INR",
    receipt: orderId,
    notes: {
      orderId
    }
  });

  const createdOrder = await prisma.order.create({
    data: {
      id: orderId,
      userId: authUser?.id,
      email: payload.customer.email,
      name: payload.customer.name,
      phone: payload.customer.phone,
      addressLine1: payload.shippingAddress.addressLine1,
      addressLine2: payload.shippingAddress.addressLine2 || null,
      city: payload.shippingAddress.city,
      state: payload.shippingAddress.state || null,
      pincode: payload.shippingAddress.pincode,
      country: payload.shippingAddress.country || "India",
      subtotal,
      originalSubtotal,
      baseSavings,
      couponCode: appliedPromoCode,
      couponDiscount: promoDiscount,
      gst,
      shipping,
      total,
      status: "pending",
      razorpayOrderId: razorpayOrder.id,
      items: {
        create: validatedItems.map((item) => ({
          productId: item.productId,
          variantDbId: item.variantDbId,
          variantId: item.variantId,
          slug: item.slug,
          name: item.name,
          image: item.image,
          variantLabel: item.variantLabel,
          unitPrice: item.unitPrice,
          compareAtPrice: item.compareAtUnitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal
        }))
      },
      payment: {
        create: {
          razorpayOrderId: razorpayOrder.id,
          amount: amountInPaise,
          currency: "INR",
          status: "created"
        }
      }
    },
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
      total: true
    }
  });

  return buildOrderResponse({
    order: {
      id: createdOrder.id,
      email: createdOrder.email,
      status: "pending",
      createdAt: createdOrder.createdAt,
      total: createdOrder.total
    },
    items: validatedItems,
    pricing,
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      description: `Auraville order ${createdOrder.id}`
    }
  });
}
