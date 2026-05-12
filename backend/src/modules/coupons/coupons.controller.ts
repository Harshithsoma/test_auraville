import type { RequestHandler } from "express";
import type { AvailableCouponsRequest, CouponValidateRequest } from "./coupons.types";
import {
  CouponValidationError,
  listAvailableCoupons,
  listCoupons,
  validateCoupon
} from "./coupons.service";
import type {
  AvailableCouponsValidatedInput,
  ValidateCouponValidatedInput
} from "./coupons.validation";

export const validateCouponController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as ValidateCouponValidatedInput;
    const result = await validateCoupon(body as CouponValidateRequest, {
      userId: req.authUser?.id,
      email: req.authUser?.email
    });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CouponValidationError) {
      res.status(400).json({
        error: {
          code: "INVALID_COUPON",
          message: "Invalid promo code"
        }
      });
      return;
    }

    next(error);
  }
};

export const listCouponsController: RequestHandler = async (req, res, next) => {
  try {
    void req;
    const result = await listCoupons();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const availableCouponsController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AvailableCouponsValidatedInput;
    const result = await listAvailableCoupons({
      input: body as AvailableCouponsRequest,
      context: {
        userId: req.authUser?.id,
        email: req.authUser?.email
      }
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
