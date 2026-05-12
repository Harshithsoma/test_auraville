import type { RequestHandler } from "express";
import { calculateCartPrice } from "./cart.service";
import type { CartPriceValidatedInput } from "./cart.validation";

export const cartPriceController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as CartPriceValidatedInput;
    const result = await calculateCartPrice(body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
