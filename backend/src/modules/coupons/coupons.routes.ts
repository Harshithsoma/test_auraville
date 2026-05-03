import { Router } from "express";
import { attachOptionalAuth } from "../../middleware/auth.middleware";
import { couponRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { validateCouponController } from "./coupons.controller";
import { validateCouponSchema } from "./coupons.validation";

export const couponsRouter = Router();

couponsRouter.post(
  "/coupons/validate",
  couponRateLimiter,
  attachOptionalAuth,
  validateRequest(validateCouponSchema),
  validateCouponController
);
