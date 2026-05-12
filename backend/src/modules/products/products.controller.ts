import type { RequestHandler } from "express";
import { getProductBySlug, listProducts } from "./products.service";
import type {
  GetProductBySlugValidatedInput,
  ListProductsValidatedInput
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
