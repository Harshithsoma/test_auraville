import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { getProductBySlugController, listProductsController } from "./products.controller";
import { getProductBySlugSchema, listProductsSchema } from "./products.validation";

export const productsRouter = Router();

productsRouter.get("/products", validateRequest(listProductsSchema), listProductsController);
productsRouter.get("/products/:slug", validateRequest(getProductBySlugSchema), getProductBySlugController);
