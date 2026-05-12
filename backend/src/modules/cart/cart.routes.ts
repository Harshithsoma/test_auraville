import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { cartPriceController } from "./cart.controller";
import { cartPriceSchema } from "./cart.validation";

export const cartRouter = Router();

cartRouter.post("/cart/price", validateRequest(cartPriceSchema), cartPriceController);
