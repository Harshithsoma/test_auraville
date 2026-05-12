import type { RequestHandler } from "express";
import { listCategories } from "./categories.service";

export const listCategoriesController: RequestHandler = async (_req, res, next) => {
  try {
    const categories = await listCategories();
    res.status(200).json({ data: categories });
  } catch (error) {
    next(error);
  }
};
