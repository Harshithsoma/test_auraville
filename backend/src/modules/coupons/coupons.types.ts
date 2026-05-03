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
