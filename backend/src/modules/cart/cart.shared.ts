import { prisma } from "../../prisma/prisma.service";
import { calculateCompareAtUnitPrice } from "../../utils/pricing";
import { HttpError } from "../../utils/http-error";
import type { CartPriceItemInput, CartPriceResponseItem } from "./cart.types";

export class CouponValidationError extends HttpError {
  public constructor(message: string, details?: unknown) {
    super(400, message, details, "INVALID_COUPON");
  }
}

export type CouponValidationContext = {
  userId?: string;
  email?: string;
};

export type CouponPricingResult = {
  code: string;
  type: "PERCENT" | "FLAT";
  discountValue: number;
  discountAmount: number;
};

export type ValidatedCartItem = CartPriceResponseItem & {
  variantDbId: string;
};

export function normalizePromoCode(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  const normalized = code.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
}

export async function enrichCartItems(items: CartPriceItemInput[]): Promise<ValidatedCartItem[]> {
  if (items.length === 0) {
    throw new HttpError(400, "Cart cannot be empty");
  }

  const enrichedItems: ValidatedCartItem[] = [];

  for (const item of items) {
    if (item.quantity < 1) {
      throw new HttpError(400, "Invalid quantity", {
        productId: item.productId,
        variantId: item.variantId
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        slug: true,
        name: true,
        image: true,
        price: true,
        compareAtPrice: true,
        availability: true,
        isActive: true
      }
    });

    if (!product) {
      throw new HttpError(404, "Invalid product", {
        productId: item.productId,
        variantId: item.variantId
      });
    }

    if (!product.isActive) {
      throw new HttpError(400, "Inactive product", {
        productId: item.productId
      });
    }

    if (product.availability === "coming_soon") {
      throw new HttpError(400, "Product is coming soon", {
        productId: item.productId
      });
    }

    const variant = await prisma.productVariant.findUnique({
      where: {
        productId_frontendVariantId: {
          productId: item.productId,
          frontendVariantId: item.variantId
        }
      },
      select: {
        id: true,
        frontendVariantId: true,
        label: true,
        price: true,
        stock: true,
        isActive: true
      }
    });

    if (!variant) {
      throw new HttpError(404, "Variant not found", {
        productId: item.productId,
        variantId: item.variantId
      });
    }

    if (!variant.isActive) {
      throw new HttpError(400, "Inactive variant", {
        productId: item.productId,
        variantId: item.variantId
      });
    }

    if (item.quantity > variant.stock) {
      throw new HttpError(400, "Insufficient stock", {
        productId: item.productId,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        availableStock: variant.stock
      });
    }

    const unitPrice = variant.price;
    const compareAtUnitPrice = calculateCompareAtUnitPrice({
      productPrice: product.price,
      productCompareAtPrice: product.compareAtPrice,
      variantPrice: unitPrice
    });

    enrichedItems.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      variantId: variant.frontendVariantId,
      variantDbId: variant.id,
      variantLabel: variant.label,
      unitPrice,
      compareAtUnitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      available: true,
      stock: variant.stock
    });
  }

  return enrichedItems;
}

function calculatePromoDiscount(params: {
  couponType: "PERCENT" | "FLAT";
  discountValue: number;
  subtotal: number;
  maxDiscount: number | null;
}): number {
  const { couponType, discountValue, subtotal, maxDiscount } = params;

  let discount =
    couponType === "PERCENT" ? Math.round((subtotal * discountValue) / 100) : discountValue;

  if (maxDiscount !== null) {
    discount = Math.min(discount, maxDiscount);
  }

  return Math.max(0, Math.min(discount, subtotal));
}

export async function validateAndCalculateCoupon(params: {
  code: string;
  subtotal: number;
  context?: CouponValidationContext;
}): Promise<CouponPricingResult> {
  const { code, subtotal, context } = params;

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      type: true,
      discountValue: true,
      minOrderValue: true,
      maxDiscount: true,
      startsAt: true,
      expiresAt: true,
      usageLimit: true,
      usageLimitPerUser: true,
      usedCount: true,
      isActive: true
    }
  });

  if (!coupon) {
    throw new CouponValidationError("Invalid promo code");
  }

  if (!coupon.isActive) {
    throw new CouponValidationError("Invalid promo code");
  }

  const now = new Date();

  if (coupon.startsAt && now < coupon.startsAt) {
    throw new CouponValidationError("Invalid promo code");
  }

  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new CouponValidationError("Invalid promo code");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new CouponValidationError("Invalid promo code");
  }

  if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
    throw new CouponValidationError("Invalid promo code");
  }

  if (coupon.usageLimitPerUser !== null) {
    if (context?.userId) {
      const usageCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId: context.userId
        }
      });

      if (usageCount >= coupon.usageLimitPerUser) {
        throw new CouponValidationError("Invalid promo code");
      }
    } else if (context?.email) {
      const usageCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          email: context.email.toLowerCase()
        }
      });

      if (usageCount >= coupon.usageLimitPerUser) {
        throw new CouponValidationError("Invalid promo code");
      }
    }
  }

  const discountAmount = calculatePromoDiscount({
    couponType: coupon.type,
    discountValue: coupon.discountValue,
    subtotal,
    maxDiscount: coupon.maxDiscount
  });

  return {
    code: coupon.code,
    type: coupon.type,
    discountValue: coupon.discountValue,
    discountAmount
  };
}
