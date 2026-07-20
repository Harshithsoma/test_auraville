import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1)
});

const cartIdentitySchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1)
});

export const cartPriceSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    items: z.array(cartItemSchema),
    promoCode: z.string().trim().min(1).max(64).optional()
  })
});

export const accountCartItemSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: cartItemSchema
});

export const accountCartMergeSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    mergeId: z.string().trim().min(8).max(128),
    items: z.array(cartItemSchema)
  })
});

export const accountCartRemoveSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: cartIdentitySchema
});

export type CartPriceValidatedInput = z.infer<typeof cartPriceSchema>;
export type AccountCartItemValidatedInput = z.infer<typeof accountCartItemSchema>;
export type AccountCartMergeValidatedInput = z.infer<typeof accountCartMergeSchema>;
export type AccountCartRemoveValidatedInput = z.infer<typeof accountCartRemoveSchema>;
