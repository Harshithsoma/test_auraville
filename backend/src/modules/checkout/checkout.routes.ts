import { Router } from "express";
import { attachOptionalAuth } from "../../middleware/auth.middleware";
import { checkoutRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { createCheckoutOrderController } from "./checkout.controller";
import { checkoutCreateOrderSchema } from "./checkout.validation";

export const checkoutRouter = Router();

checkoutRouter.post(
  "/checkout/orders",
  checkoutRateLimiter,
  attachOptionalAuth,
  validateRequest(checkoutCreateOrderSchema),
  createCheckoutOrderController
);
