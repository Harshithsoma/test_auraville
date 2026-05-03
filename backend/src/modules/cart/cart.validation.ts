import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1)
});

export const cartPriceSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    items: z.array(cartItemSchema),
    promoCode: z.string().trim().min(1).max(64).optional()
  })
});

export type CartPriceValidatedInput = z.infer<typeof cartPriceSchema>;
