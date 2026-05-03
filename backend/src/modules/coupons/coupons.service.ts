import type { CouponValidateRequest, CouponValidateResponse } from "./coupons.types";
import {
  CouponValidationError,
  enrichCartItems,
  normalizePromoCode,
  validateAndCalculateCoupon
} from "../cart/cart.shared";

export { CouponValidationError };

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
