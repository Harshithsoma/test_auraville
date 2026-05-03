import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { getOrderByIdController, listOrdersController } from "./orders.controller";
import { getOrderByIdSchema, listOrdersSchema } from "./orders.validation";

export const ordersRouter = Router();

ordersRouter.get("/orders", validateRequest(listOrdersSchema), requireAuth, listOrdersController);
ordersRouter.get("/orders/:id", validateRequest(getOrderByIdSchema), requireAuth, getOrderByIdController);
