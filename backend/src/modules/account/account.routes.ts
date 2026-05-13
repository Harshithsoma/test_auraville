import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  createUserAddressController,
  deleteUserAddressController,
  listUserAddressesController,
  patchUserAddressController,
  setDefaultUserAddressController,
  updateUserPasswordController
} from "./account.controller";
import {
  createAccountAddressSchema,
  deleteAccountAddressSchema,
  listAccountAddressesSchema,
  patchAccountAddressSchema,
  setDefaultAccountAddressSchema,
  updateAccountPasswordSchema
} from "./account.validation";

export const accountRouter = Router();

accountRouter.get(
  "/account/addresses",
  validateRequest(listAccountAddressesSchema),
  requireAuth,
  listUserAddressesController
);
accountRouter.post(
  "/account/addresses",
  validateRequest(createAccountAddressSchema),
  requireAuth,
  createUserAddressController
);
accountRouter.patch(
  "/account/addresses/:id",
  validateRequest(patchAccountAddressSchema),
  requireAuth,
  patchUserAddressController
);
accountRouter.delete(
  "/account/addresses/:id",
  validateRequest(deleteAccountAddressSchema),
  requireAuth,
  deleteUserAddressController
);
accountRouter.patch(
  "/account/addresses/:id/default",
  validateRequest(setDefaultAccountAddressSchema),
  requireAuth,
  setDefaultUserAddressController
);
accountRouter.patch(
  "/account/password",
  validateRequest(updateAccountPasswordSchema),
  requireAuth,
  updateUserPasswordController
);
