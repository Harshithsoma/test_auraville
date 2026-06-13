import { prisma } from "../../prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import { HttpError } from "../../utils/http-error";
import { passwordHash, verifyPassword } from "../../utils/password";
import type { UserAddressResponse, UserAddressesListResponse } from "./account.types";
import type {
  CreateAccountAddressValidatedInput,
  PatchAccountAddressValidatedInput
} from "./account.validation";

type ComparableAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string | null;
  landmark?: string | null;
};

function normalizeText(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

function normalizeAddress(address: ComparableAddress) {
  return {
    fullName: normalizeText(address.fullName),
    phone: normalizePhone(address.phone),
    addressLine1: normalizeText(address.addressLine1),
    addressLine2: normalizeText(address.addressLine2),
    city: normalizeText(address.city),
    state: normalizeText(address.state),
    pincode: address.pincode.replace(/\D/g, ""),
    country: normalizeText(address.country || "India"),
    landmark: normalizeText(address.landmark)
  };
}

function isSameAddress(left: ComparableAddress, right: ComparableAddress): boolean {
  const a = normalizeAddress(left);
  const b = normalizeAddress(right);

  return (
    a.fullName === b.fullName &&
    a.phone === b.phone &&
    a.addressLine1 === b.addressLine1 &&
    a.addressLine2 === b.addressLine2 &&
    a.city === b.city &&
    a.state === b.state &&
    a.pincode === b.pincode &&
    a.country === b.country &&
    a.landmark === b.landmark
  );
}

async function assertAddressIsUnique(params: {
  tx: Prisma.TransactionClient;
  userId: string;
  candidate: ComparableAddress;
  excludeAddressId?: string;
}) {
  const existingAddresses = await params.tx.userAddress.findMany({
    where: {
      userId: params.userId,
      ...(params.excludeAddressId ? { NOT: { id: params.excludeAddressId } } : {})
    },
    select: {
      fullName: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
      country: true,
      landmark: true
    }
  });

  if (existingAddresses.some((address) => isSameAddress(params.candidate, address))) {
    throw new HttpError(409, "This address is already saved.", undefined, "DUPLICATE_ADDRESS");
  }
}

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

  const created = await prisma.$transaction(async (tx) => {
    await assertAddressIsUnique({
      tx,
      userId,
      candidate: {
        fullName: payload.fullName,
        phone: payload.phone,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2 || null,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        country: payload.country || "India",
        landmark: payload.landmark || null
      }
    });

    const existingCount = await tx.userAddress.count({ where: { userId } });
    const shouldSetDefault = payload.isDefault === true || existingCount === 0;

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
    await assertAddressIsUnique({
      tx,
      userId,
      excludeAddressId: address.id,
      candidate: {
        fullName: payload.fullName ?? address.fullName,
        phone: payload.phone ?? address.phone,
        addressLine1: payload.addressLine1 ?? address.addressLine1,
        addressLine2: payload.addressLine2 !== undefined ? payload.addressLine2 || null : address.addressLine2,
        city: payload.city ?? address.city,
        state: payload.state ?? address.state,
        pincode: payload.pincode ?? address.pincode,
        country: payload.country ?? address.country,
        landmark: payload.landmark !== undefined ? payload.landmark || null : address.landmark
      }
    });

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

export async function updateUserPassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ data: { message: string } }> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      isActive: true,
      passwordHash: true
    }
  });

  if (!user || !user.isActive) {
    throw new HttpError(401, "Unauthorized");
  }

  if (!user.passwordHash) {
    throw new HttpError(
      400,
      "Password login is not set for this account yet. Use forgot password to set one.",
      undefined,
      "PASSWORD_NOT_SET"
    );
  }

  const isValidCurrentPassword = await verifyPassword(params.currentPassword, user.passwordHash);
  if (!isValidCurrentPassword) {
    throw new HttpError(400, "Current password is incorrect.", undefined, "INVALID_CURRENT_PASSWORD");
  }

  const nextPasswordHash = await passwordHash(params.newPassword);
  await prisma.user.update({
    where: { id: params.userId },
    data: {
      passwordHash: nextPasswordHash,
      passwordUpdatedAt: new Date()
    }
  });

  return {
    data: {
      message: "Password updated successfully."
    }
  };
}
