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

export type CreateReviewValidatedInput = z.infer<typeof createReviewSchema>;
export type ListReviewsValidatedInput = z.infer<typeof listReviewsSchema>;
