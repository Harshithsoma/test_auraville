import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { getProductBySlugController, listProductsController, notifyMeController } from "./products.controller";
import { getProductBySlugSchema, listProductsSchema, notifyMeSchema } from "./products.validation";

export const productsRouter = Router();

productsRouter.get("/products", validateRequest(listProductsSchema), listProductsController);
productsRouter.get("/products/:slug", validateRequest(getProductBySlugSchema), getProductBySlugController);
productsRouter.post(
  "/products/:id/notify-me",
  validateRequest(notifyMeSchema),
  requireAuth,
  notifyMeController
);
