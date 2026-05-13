import type { RequestHandler } from "express";
import { HttpError } from "../../utils/http-error";
import { getProductBySlug, listProducts, registerProductNotifyRequest } from "./products.service";
import type {
  GetProductBySlugValidatedInput,
  ListProductsValidatedInput,
  NotifyMeValidatedInput
} from "./products.validation";

export const listProductsController: RequestHandler = async (req, res, next) => {
  try {
    const { query } = req as unknown as ListProductsValidatedInput;
    const result = await listProducts(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getProductBySlugController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as GetProductBySlugValidatedInput;
    const product = await getProductBySlug(params.slug);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
};

export const notifyMeController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as NotifyMeValidatedInput;
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized", undefined, "UNAUTHORIZED");
    }

    const result = await registerProductNotifyRequest({
      productId: params.id,
      user: {
        id: req.authUser.id,
        email: req.authUser.email
      }
    });

    res.status(200).json({
      data: {
        message: result.message
      }
    });
  } catch (error) {
    next(error);
  }
};
