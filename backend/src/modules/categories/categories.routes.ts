import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { listCategoriesController } from "./categories.controller";
import { listCategoriesSchema } from "./categories.validation";

export const categoriesRouter = Router();

categoriesRouter.get("/categories", validateRequest(listCategoriesSchema), listCategoriesController);
