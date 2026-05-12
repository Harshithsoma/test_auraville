import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { createRazorpayOrder } from "../config/razorpay";
import { validateRequest } from "../middleware/validate.middleware";

const debugOrderSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const debugRouter = Router();

debugRouter.post(
  "/debug/razorpay/order",
  validateRequest(debugOrderSchema),
  async (_req, res, next) => {
    if (env.NODE_ENV === "production") {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Not found"
        }
      });
      return;
    }

    try {
      const razorpayOrder = await createRazorpayOrder({
        amountInPaise: 10_000,
        currency: "INR",
        receipt: `debug_frontend_${Date.now()}`
      });

      res.status(200).json({
        data: {
          keyId: env.RAZORPAY_KEY_ID,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
