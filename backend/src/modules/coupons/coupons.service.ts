import { prisma } from "../../prisma/prisma.service";
import type {
  AvailableCouponsRequest,
  AvailableCouponsResponse,
  CouponValidateRequest,
  CouponValidateResponse,
  ListCouponsResponse
} from "./coupons.types";
import {
  CouponValidationError,
  enrichCartItems,
  normalizePromoCode,
  validateAndCalculateCoupon
} from "../cart/cart.shared";

export { CouponValidationError };

function buildCouponDescription(params: {
  customDescription?: string | null;
  type: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderValue: number | null;
}): string {
  const customDescription = params.customDescription?.trim();
  if (customDescription) {
    return customDescription;
  }

  const base =
    params.type === "PERCENT"
      ? `${params.discountValue}% off`
      : `Flat Rs ${params.discountValue} off`;

  if (params.minOrderValue && params.minOrderValue > 0) {
    return `${base} on orders above Rs ${params.minOrderValue}`;
  }

  return base;
}

function buildCouponDisplayText(params: {
  customDescription?: string | null;
  type: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderValue: number | null;
}): string {
  const customDescription = params.customDescription?.trim();
  if (customDescription) {
    return customDescription;
  }

  const discountText =
    params.type === "PERCENT" ? `${params.discountValue}% off` : `Flat Rs ${params.discountValue} off`;

  if (params.minOrderValue && params.minOrderValue > 0) {
    return `${discountText} on orders above Rs ${params.minOrderValue}`;
  }

  return discountText;
}

export async function validateCoupon(
  input: CouponValidateRequest,
  context?: { userId?: string; email?: string }
): Promise<CouponValidateResponse> {
  const normalizedCode = normalizePromoCode(input.code);

  if (!normalizedCode) {
    throw new CouponValidationError("Invalid promo code");
  }

  const enrichedItems = await enrichCartItems(input.items);
  const subtotal = enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const coupon = await validateAndCalculateCoupon({
    code: normalizedCode,
    subtotal,
    context
  });

  return {
    data: {
      ok: true,
      code: coupon.code,
      discountType: coupon.type,
      discountValue: coupon.discountValue,
      discountAmount: coupon.discountAmount,
      message: `Promo ${coupon.code} applied`
    }
  };
}

export async function listCoupons(): Promise<ListCouponsResponse> {
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }]
    },
    orderBy: [{ expiresAt: "asc" }, { code: "asc" }],
    select: {
      code: true,
      description: true,
      type: true,
      discountValue: true,
      minOrderValue: true,
      isActive: true,
      expiresAt: true
    }
  });

  return {
    data: coupons.map((coupon) => ({
      code: coupon.code,
      description: buildCouponDescription({
        customDescription: coupon.description,
        type: coupon.type,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue
      }),
      discountType: coupon.type,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderValue,
      isActive: coupon.isActive,
      expiryDate: coupon.expiresAt ? coupon.expiresAt.toISOString() : null
    }))
  };
}

export async function listAvailableCoupons(params: {
  input: AvailableCouponsRequest;
  context?: { userId?: string; email?: string };
}): Promise<AvailableCouponsResponse> {
  const { input, context } = params;
  const enrichedItems = await enrichCartItems(input.items);
  const subtotal = enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const now = new Date();

  const coupons = await prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { expiresAt: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      type: true,
      discountValue: true,
      description: true,
      minOrderValue: true,
      startsAt: true,
      expiresAt: true,
      usageLimit: true,
      usageLimitPerUser: true,
      usedCount: true,
      isActive: true
    }
  });

  const hasUsageScope = Boolean(context?.userId || context?.email);
  const couponIds = coupons.map((coupon) => coupon.id);
  const usageByCouponId = new Map<string, number>();

  if (hasUsageScope && couponIds.length > 0) {
    const usageRows = await prisma.couponUsage.groupBy({
      by: ["couponId"],
      where: context?.userId
        ? {
            couponId: { in: couponIds },
            userId: context.userId
          }
        : {
            couponId: { in: couponIds },
            email: context?.email?.toLowerCase()
          },
      _count: {
        _all: true
      }
    });

    for (const row of usageRows) {
      usageByCouponId.set(row.couponId, row._count._all);
    }
  }

  const couponRows = coupons.map((coupon) => {
    let isEligible = true;
    let eligibilityReason: string | null = null;

    if (!coupon.isActive || (coupon.startsAt && now < coupon.startsAt)) {
      isEligible = false;
      eligibilityReason = "Not active";
    } else if (coupon.expiresAt && now > coupon.expiresAt) {
      isEligible = false;
      eligibilityReason = "Expired";
    } else if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      isEligible = false;
      eligibilityReason = "Usage limit reached";
    } else if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
      isEligible = false;
      eligibilityReason = `Minimum order Rs ${coupon.minOrderValue} required`;
    } else if (coupon.usageLimitPerUser !== null && hasUsageScope) {
      const usageCount = usageByCouponId.get(coupon.id) ?? 0;
      if (usageCount >= coupon.usageLimitPerUser) {
        isEligible = false;
        eligibilityReason = coupon.usageLimitPerUser === 1 ? "Already used" : "Usage limit reached";
      }
    }

    return {
      code: coupon.code,
      description: buildCouponDescription({
        customDescription: coupon.description,
        type: coupon.type,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue
      }),
      discountType: coupon.type,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderValue,
      isEligible,
      eligibilityReason,
      displayText: buildCouponDisplayText({
        customDescription: coupon.description,
        type: coupon.type,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue
      }),
      isActive: coupon.isActive,
      expiryDate: coupon.expiresAt ? coupon.expiresAt.toISOString() : null
    };
  });

  return { data: couponRows };
}
