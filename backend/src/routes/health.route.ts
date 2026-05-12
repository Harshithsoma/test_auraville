import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../middleware/validate.middleware";
import { prisma } from "../prisma/prisma.service";

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

healthRouter.get("/health/ready", validateRequest(healthQuerySchema), async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      data: {
        status: "ready"
      }
    });
  } catch {
    res.status(503).json({
      error: {
        code: "NOT_READY",
        message: "Service is not ready"
      }
    });
  }
});
