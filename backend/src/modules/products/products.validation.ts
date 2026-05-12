import { z } from "zod";

const booleanFromQuery = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return value === "true";
  });

export const listProductsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    category: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional(),
    featured: booleanFromQuery.optional(),
    bestSeller: booleanFromQuery.optional(),
    isNew: booleanFromQuery.optional(),
    availability: z.enum(["available", "coming-soon"]).optional(),
    sort: z.enum(["popular", "price-asc", "price-desc", "newest"]).default("popular")
  })
});

export const getProductBySlugSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    slug: z.string().trim().min(1)
  })
});

export type ListProductsValidatedInput = z.infer<typeof listProductsSchema>;
export type GetProductBySlugValidatedInput = z.infer<typeof getProductBySlugSchema>;
