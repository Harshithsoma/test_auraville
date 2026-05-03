import { Router } from "express";
import { paymentRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { razorpayWebhookController, verifyPaymentController } from "./payments.controller";
import { paymentVerifySchema } from "./payments.validation";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/payments/verify",
  paymentRateLimiter,
  validateRequest(paymentVerifySchema),
  verifyPaymentController
);

paymentsRouter.post("/payments/webhook/razorpay", paymentRateLimiter, razorpayWebhookController);
