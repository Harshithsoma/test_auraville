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

export type ValidateCouponValidatedInput = z.infer<typeof validateCouponSchema>;
