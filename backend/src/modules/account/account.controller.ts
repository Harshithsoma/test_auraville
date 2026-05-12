import type { RequestHandler } from "express";
import {
  createUserAddress,
  deleteUserAddress,
  listUserAddresses,
  patchUserAddress,
  setDefaultUserAddress
} from "./account.service";
import type {
  CreateAccountAddressValidatedInput,
  DeleteAccountAddressValidatedInput,
  PatchAccountAddressValidatedInput,
  SetDefaultAccountAddressValidatedInput
} from "./account.validation";

export const listUserAddressesController: RequestHandler = async (req, res, next) => {
  try {
    const result = await listUserAddresses(req.authUser!.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createUserAddressController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as CreateAccountAddressValidatedInput;
    const result = await createUserAddress({
      userId: req.authUser!.id,
      payload: body
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const patchUserAddressController: RequestHandler = async (req, res, next) => {
  try {
    const { body, params } = req as unknown as PatchAccountAddressValidatedInput;
    const result = await patchUserAddress({
      userId: req.authUser!.id,
      addressId: params.id,
      payload: body
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteUserAddressController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as DeleteAccountAddressValidatedInput;
    const result = await deleteUserAddress({
      userId: req.authUser!.id,
      addressId: params.id
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const setDefaultUserAddressController: RequestHandler = async (req, res, next) => {
  try {
    const { params } = req as unknown as SetDefaultAccountAddressValidatedInput;
    const result = await setDefaultUserAddress({
      userId: req.authUser!.id,
      addressId: params.id
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
