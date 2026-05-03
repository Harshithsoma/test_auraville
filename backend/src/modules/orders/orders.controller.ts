import type { RequestHandler } from "express";
import { HttpError } from "../../utils/http-error";
import { getUserOrderById, listUserOrders } from "./orders.service";
import type { GetOrderByIdValidatedInput, ListOrdersValidatedInput } from "./orders.validation";

export const listOrdersController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const { query } = req as unknown as ListOrdersValidatedInput;
    const result = await listUserOrders({
      userId: req.authUser.id,
      query
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getOrderByIdController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const { params } = req as unknown as GetOrderByIdValidatedInput;
    const result = await getUserOrderById({
      userId: req.authUser.id,
      orderId: params.id
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
