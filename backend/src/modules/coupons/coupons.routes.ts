import { Router } from "express";
import { attachOptionalAuth } from "../../middleware/auth.middleware";
import { couponRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  availableCouponsController,
  listCouponsController,
  validateCouponController
} from "./coupons.controller";
import {
  availableCouponsSchema,
  listCouponsSchema,
  validateCouponSchema
} from "./coupons.validation";

export const couponsRouter = Router();

couponsRouter.get(
  "/coupons",
  couponRateLimiter,
  validateRequest(listCouponsSchema),
  listCouponsController
);

couponsRouter.post(
  "/coupons/available",
  couponRateLimiter,
  attachOptionalAuth,
  validateRequest(availableCouponsSchema),
  availableCouponsController
);

couponsRouter.post(
  "/coupons/validate",
  couponRateLimiter,
  attachOptionalAuth,
  validateRequest(validateCouponSchema),
  validateCouponController
);
