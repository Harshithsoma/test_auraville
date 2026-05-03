import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1)
});

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/)
});

const shippingAddressSchema = z.object({
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().max(120).optional(),
  pincode: z.string().trim().min(4).max(12),
  country: z.string().trim().max(120).optional()
});

export const checkoutCreateOrderSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    items: z.array(itemSchema).min(1),
    promoCode: z.string().trim().min(1).max(64).optional(),
    customer: customerSchema,
    shippingAddress: shippingAddressSchema
  })
});

export type CheckoutCreateOrderValidatedInput = z.infer<typeof checkoutCreateOrderSchema>;
