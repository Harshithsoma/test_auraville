import type { RequestHandler } from "express";
import { createCheckoutOrder } from "./checkout.service";
import type { CheckoutCreateOrderValidatedInput } from "./checkout.validation";

export const createCheckoutOrderController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as CheckoutCreateOrderValidatedInput;

    const result = await createCheckoutOrder({
      payload: body,
      authUser: req.authUser
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
