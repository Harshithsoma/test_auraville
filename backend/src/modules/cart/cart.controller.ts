import type { RequestHandler } from "express";
import { HttpError } from "../../utils/http-error";
import {
  addUserCartItem,
  calculateCartPrice,
  clearUserCartItems,
  getUserCartItems,
  mergeUserCartItems,
  removeUserCartItem,
  updateUserCartItem
} from "./cart.service";
import type {
  AccountCartItemValidatedInput,
  AccountCartMergeValidatedInput,
  AccountCartRemoveValidatedInput,
  CartPriceValidatedInput
} from "./cart.validation";

function requireRequestUserId(req: Parameters<RequestHandler>[0]): string {
  const userId = req.authUser?.id;
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }
  return userId;
}

export const cartPriceController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as CartPriceValidatedInput;
    const result = await calculateCartPrice(body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAccountCartController: RequestHandler = async (req, res, next) => {
  try {
    const result = await getUserCartItems(requireRequestUserId(req));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const addAccountCartItemController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AccountCartItemValidatedInput;
    const result = await addUserCartItem(requireRequestUserId(req), body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateAccountCartItemController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AccountCartItemValidatedInput;
    const result = await updateUserCartItem(requireRequestUserId(req), body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const removeAccountCartItemController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AccountCartRemoveValidatedInput;
    const result = await removeUserCartItem(requireRequestUserId(req), body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const clearAccountCartController: RequestHandler = async (req, res, next) => {
  try {
    const result = await clearUserCartItems(requireRequestUserId(req));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const mergeAccountCartController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as AccountCartMergeValidatedInput;
    const result = await mergeUserCartItems(requireRequestUserId(req), body.mergeId, body.items);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
