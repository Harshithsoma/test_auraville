import { z } from "zod";

const addressBodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().trim().min(4).max(12),
  country: z.string().trim().min(2).max(120).default("India"),
  landmark: z.string().trim().max(255).optional(),
  isDefault: z.boolean().optional()
});

const addressParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const listAccountAddressesSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

export const createAccountAddressSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: addressBodySchema
});

export const patchAccountAddressSchema = z.object({
  query: z.object({}).passthrough(),
  params: addressParamsSchema,
  body: addressBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  })
});

export const deleteAccountAddressSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: addressParamsSchema
});

export const setDefaultAccountAddressSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: addressParamsSchema
});

export const updateAccountPasswordSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(5, "Password must be at least 5 characters"),
      confirmPassword: z.string().min(1)
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"]
    })
});

export type ListAccountAddressesValidatedInput = z.infer<typeof listAccountAddressesSchema>;
export type CreateAccountAddressValidatedInput = z.infer<typeof createAccountAddressSchema>;
export type PatchAccountAddressValidatedInput = z.infer<typeof patchAccountAddressSchema>;
export type DeleteAccountAddressValidatedInput = z.infer<typeof deleteAccountAddressSchema>;
export type SetDefaultAccountAddressValidatedInput = z.infer<typeof setDefaultAccountAddressSchema>;
export type UpdateAccountPasswordValidatedInput = z.infer<typeof updateAccountPasswordSchema>;
