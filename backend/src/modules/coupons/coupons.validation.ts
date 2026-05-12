import { z } from "zod";

const couponItemSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1)
});

export const validateCouponSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    code: z.string().trim().min(1).max(64),
    items: z.array(couponItemSchema).min(1)
  })
});

export const listCouponsSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export const availableCouponsSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    items: z.array(couponItemSchema).min(1)
  })
});

export type ValidateCouponValidatedInput = z.infer<typeof validateCouponSchema>;
export type ListCouponsValidatedInput = z.infer<typeof listCouponsSchema>;
export type AvailableCouponsValidatedInput = z.infer<typeof availableCouponsSchema>;
