import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validate.middleware";

const healthQuerySchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const healthRouter = Router();

healthRouter.get("/health", validateRequest(healthQuerySchema), (_req, res) => {
  res.status(200).json({
    data: {
      status: "ok"
    }
  });
});
