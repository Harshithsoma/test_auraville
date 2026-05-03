import { z } from "zod";

export const listOrdersSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10)
  })
});

export const getOrderByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export type ListOrdersValidatedInput = z.infer<typeof listOrdersSchema>;
export type GetOrderByIdValidatedInput = z.infer<typeof getOrderByIdSchema>;
