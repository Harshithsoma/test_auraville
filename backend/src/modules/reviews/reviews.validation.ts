import { z } from "zod";

export const createReviewSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    subject: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(5000),
    productId: z.string().trim().min(1).optional()
  })
});

export const listReviewsSchema = z.object({
  params: z.object({}).passthrough(),
  body: z.object({}).passthrough(),
  query: z.object({
    productId: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10)
  })
});

export const verifiedRateSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    orderId: z.string().trim().min(1),
    orderItemId: z.string().trim().min(1),
    productId: z.string().trim().min(1),
    rating: z.coerce.number().int().min(1).max(5)
  })
});

export const verifiedTextSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z
    .object({
      reviewId: z.string().trim().min(1),
      subject: z.string().trim().max(160).optional(),
      body: z.string().trim().max(5000).optional()
    })
    .refine((value) => Boolean(value.subject?.trim() || value.body?.trim()), {
      message: "Either subject or body is required"
    })
});

export const verifiedPromptSchema = z.object({
  params: z.object({}).passthrough(),
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

export const verifiedFromLinkSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    token: z.string().trim().min(1),
    rating: z.coerce.number().int().min(1).max(5)
  })
});

export const verifiedFromLinkTextSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z
    .object({
      token: z.string().trim().min(1),
      reviewId: z.string().trim().min(1),
      subject: z.string().trim().max(160).optional(),
      body: z.string().trim().max(5000).optional()
    })
    .refine((value) => Boolean(value.subject?.trim() || value.body?.trim()), {
      message: "Either subject or body is required"
    })
});

export type CreateReviewValidatedInput = z.infer<typeof createReviewSchema>;
export type ListReviewsValidatedInput = z.infer<typeof listReviewsSchema>;
export type VerifiedRateValidatedInput = z.infer<typeof verifiedRateSchema>;
export type VerifiedTextValidatedInput = z.infer<typeof verifiedTextSchema>;
export type VerifiedPromptValidatedInput = z.infer<typeof verifiedPromptSchema>;
export type VerifiedFromLinkValidatedInput = z.infer<typeof verifiedFromLinkSchema>;
export type VerifiedFromLinkTextValidatedInput = z.infer<typeof verifiedFromLinkTextSchema>;
