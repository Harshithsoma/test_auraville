import { z } from "zod";

export const deleteImageSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    publicId: z.string().trim().min(1)
  })
});

export type DeleteImageValidatedInput = z.infer<typeof deleteImageSchema>;
