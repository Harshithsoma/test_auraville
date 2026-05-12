import type { RequestHandler } from "express";
import { listHomepageSections } from "./homepage.service";

export const listHomepageSectionsController: RequestHandler = async (_req, res, next) => {
  try {
    const result = await listHomepageSections();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
