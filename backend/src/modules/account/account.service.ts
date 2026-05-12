import { prisma } from "../../prisma/prisma.service";
import { HttpError } from "../../utils/http-error";
import type { UserAddressResponse, UserAddressesListResponse } from "./account.types";
import type {
  CreateAccountAddressValidatedInput,
  PatchAccountAddressValidatedInput
} from "./account.validation";

function mapAddress(address: {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserAddressResponse {
  return {
    id: address.id,
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
    landmark: address.landmark,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString()
  };
}

async function getOwnedAddressOrThrow(userId: string, addressId: string) {
  const address = await prisma.userAddress.findFirst({
    where: {
      id: addressId,
      userId
    }
  });

  if (!address) {
    throw new HttpError(404, "Address not found", undefined, "ADDRESS_NOT_FOUND");
  }

  return address;
}

export async function listUserAddresses(userId: string): Promise<UserAddressesListResponse> {
  const addresses = await prisma.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });

  return {
    data: addresses.map(mapAddress)
  };
}

export async function createUserAddress(params: {
  userId: string;
  payload: CreateAccountAddressValidatedInput["body"];
}): Promise<{ data: UserAddressResponse }> {
  const { userId, payload } = params;
  const existingCount = await prisma.userAddress.count({ where: { userId } });
  const shouldSetDefault = payload.isDefault === true || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    return tx.userAddress.create({
      data: {
        userId,
        fullName: payload.fullName,
        phone: payload.phone,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2 || null,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        country: payload.country || "India",
        landmark: payload.landmark || null,
        isDefault: shouldSetDefault
      }
    });
  });

  return {
    data: mapAddress(created)
  };
}

export async function patchUserAddress(params: {
  userId: string;
  addressId: string;
  payload: PatchAccountAddressValidatedInput["body"];
}): Promise<{ data: UserAddressResponse }> {
  const { userId, addressId, payload } = params;
  const address = await getOwnedAddressOrThrow(userId, addressId);
  const shouldSetDefault = payload.isDefault === true;

  const updated = await prisma.$transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    return tx.userAddress.update({
      where: { id: address.id },
      data: {
        ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.addressLine1 !== undefined ? { addressLine1: payload.addressLine1 } : {}),
        ...(payload.addressLine2 !== undefined ? { addressLine2: payload.addressLine2 || null } : {}),
        ...(payload.city !== undefined ? { city: payload.city } : {}),
        ...(payload.state !== undefined ? { state: payload.state } : {}),
        ...(payload.pincode !== undefined ? { pincode: payload.pincode } : {}),
        ...(payload.country !== undefined ? { country: payload.country } : {}),
        ...(payload.landmark !== undefined ? { landmark: payload.landmark || null } : {}),
        ...(payload.isDefault !== undefined
          ? {
              isDefault: payload.isDefault
            }
          : {})
      }
    });
  });

  return {
    data: mapAddress(updated)
  };
}

export async function deleteUserAddress(params: {
  userId: string;
  addressId: string;
}): Promise<{ data: { id: string; deleted: true } }> {
  const { userId, addressId } = params;
  const address = await getOwnedAddressOrThrow(userId, addressId);

  await prisma.$transaction(async (tx) => {
    await tx.userAddress.delete({
      where: { id: address.id }
    });

    if (address.isDefault) {
      const fallback = await tx.userAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });

      if (fallback) {
        await tx.userAddress.update({
          where: { id: fallback.id },
          data: { isDefault: true }
        });
      }
    }
  });

  return {
    data: {
      id: addressId,
      deleted: true
    }
  };
}

export async function setDefaultUserAddress(params: {
  userId: string;
  addressId: string;
}): Promise<{ data: UserAddressResponse }> {
  const { userId, addressId } = params;
  const address = await getOwnedAddressOrThrow(userId, addressId);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.userAddress.updateMany({
      where: { userId },
      data: { isDefault: false }
    });

    return tx.userAddress.update({
      where: { id: address.id },
      data: { isDefault: true }
    });
  });

  return {
    data: mapAddress(updated)
  };
}
