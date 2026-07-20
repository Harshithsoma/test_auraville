import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  addAccountCartItemController,
  cartPriceController,
  clearAccountCartController,
  getAccountCartController,
  mergeAccountCartController,
  removeAccountCartItemController,
  updateAccountCartItemController
} from "./cart.controller";
import {
  accountCartItemSchema,
  accountCartMergeSchema,
  accountCartRemoveSchema,
  cartPriceSchema
} from "./cart.validation";

export const cartRouter = Router();

cartRouter.post("/cart/price", validateRequest(cartPriceSchema), cartPriceController);
cartRouter.get("/cart/items", requireAuth, getAccountCartController);
cartRouter.post(
  "/cart/items",
  requireAuth,
  validateRequest(accountCartItemSchema),
  addAccountCartItemController
);
cartRouter.patch(
  "/cart/items",
  requireAuth,
  validateRequest(accountCartItemSchema),
  updateAccountCartItemController
);
cartRouter.post(
  "/cart/items/remove",
  requireAuth,
  validateRequest(accountCartRemoveSchema),
  removeAccountCartItemController
);
cartRouter.post("/cart/items/clear", requireAuth, clearAccountCartController);
cartRouter.post(
  "/cart/items/merge",
  requireAuth,
  validateRequest(accountCartMergeSchema),
  mergeAccountCartController
);
