import { FREE_SHIPPING_THRESHOLD, GST_RATE, SHIPPING_FEE } from "../../utils/pricing";
import type { CartPriceRequest, CartPriceResponse } from "./cart.types";
import {
  enrichCartItems,
  normalizePromoCode,
  validateAndCalculateCoupon
} from "./cart.shared";

export async function calculateCartPrice(input: CartPriceRequest): Promise<CartPriceResponse> {
  const enrichedItems = await enrichCartItems(input.items);

  const subtotal = enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const originalSubtotal = enrichedItems.reduce(
    (sum, item) => sum + item.compareAtUnitPrice * item.quantity,
    0
  );
  const baseSavings = Math.max(0, originalSubtotal - subtotal);

  const normalizedPromoCode = normalizePromoCode(input.promoCode);
  let promoDiscount = 0;
  let appliedPromoCode: string | null = null;

  if (normalizedPromoCode) {
    const couponResult = await validateAndCalculateCoupon({
      code: normalizedPromoCode,
      subtotal
    });

    promoDiscount = couponResult.discountAmount;
    appliedPromoCode = couponResult.code;
  }

  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  const gst = Math.round(discountedSubtotal * GST_RATE);
  const shipping =
    discountedSubtotal === 0 || discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = discountedSubtotal + gst + shipping;
  const totalSavings = baseSavings + promoDiscount;

  return {
    data: {
      items: enrichedItems.map(({ variantDbId: _variantDbId, ...item }) => item),
      summary: {
        originalSubtotal,
        subtotal,
        baseSavings,
        promoCode: appliedPromoCode,
        promoDiscount,
        discountedSubtotal,
        gst,
        shipping,
        total,
        totalSavings,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - discountedSubtotal)
      }
    }
  };
}
