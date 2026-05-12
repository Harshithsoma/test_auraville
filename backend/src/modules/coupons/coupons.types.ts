import type { CartPriceItemInput } from "../cart/cart.types";

export type CouponValidateRequest = {
  code: string;
  items: CartPriceItemInput[];
};

export type CouponValidateResponse = {
  data: {
    ok: true;
    code: string;
    discountType: "PERCENT" | "FLAT";
    discountValue: number;
    discountAmount: number;
    message: string;
  };
};

export type PublicCouponSummary = {
  code: string;
  description: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderAmount: number | null;
  isActive: boolean;
  expiryDate: string | null;
};

export type ListCouponsResponse = {
  data: PublicCouponSummary[];
};

export type AvailableCouponsRequest = {
  items: CartPriceItemInput[];
};

export type AvailableCouponSummary = {
  code: string;
  description: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderAmount: number | null;
  isEligible: boolean;
  eligibilityReason: string | null;
  displayText: string;
  isActive: boolean;
  expiryDate: string | null;
};

export type AvailableCouponsResponse = {
  data: AvailableCouponSummary[];
};
