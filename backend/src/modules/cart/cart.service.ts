import { Prisma, type UserCartItem } from "@prisma/client";
import { prisma } from "../../prisma/prisma.service";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "../../utils/pricing";
import type {
  AccountCartResponse,
  CartPriceItemInput,
  CartPriceRequest,
  CartPriceResponse
} from "./cart.types";
import {
  enrichCartItems,
  normalizePromoCode,
  validateAndCalculateCoupon
} from "./cart.shared";

const SERIALIZABLE_RETRY_COUNT = 3;
const MERGE_OPERATION_RETENTION_DAYS = 30;

type CartDbClient = Prisma.TransactionClient | typeof prisma;
type UserCartMergeOperationDelegate = {
  create: (args: Prisma.UserCartMergeOperationCreateArgs) => Promise<unknown>;
  update: (args: Prisma.UserCartMergeOperationUpdateArgs) => Promise<unknown>;
  deleteMany: (args: Prisma.UserCartMergeOperationDeleteManyArgs) => Promise<unknown>;
};

function mergeOperationDb(db: CartDbClient): UserCartMergeOperationDelegate {
  return (db as CartDbClient & { userCartMergeOperation: UserCartMergeOperationDelegate }).userCartMergeOperation;
}

function toAccountCartResponse(items: UserCartItem[]): AccountCartResponse {
  return {
    data: {
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }))
    }
  };
}

function itemKey(item: Pick<CartPriceItemInput, "productId" | "variantId">): string {
  return `${item.productId}:${item.variantId}`;
}

function normalizeIncomingItems(items: CartPriceItemInput[]): CartPriceItemInput[] {
  const byKey = new Map<string, CartPriceItemInput>();

  for (const item of items) {
    const key = itemKey(item);
    const existing = byKey.get(key);
    byKey.set(key, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: (existing?.quantity ?? 0) + item.quantity
    });
  }

  return [...byKey.values()];
}

function isRetryableTransactionError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function runSerializableTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_COUNT; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (!isRetryableTransactionError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}

async function getRawUserCartItems(userId: string, db: CartDbClient = prisma): Promise<UserCartItem[]> {
  return db.userCartItem.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });
}

async function cleanupOldMergeOperations(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - MERGE_OPERATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    await mergeOperationDb(prisma).deleteMany({
      where: {
        userId,
        createdAt: { lt: cutoff }
      }
    });
  } catch {
    // Best-effort cleanup must never block cart operations.
  }
}

export async function getUserCartItems(userId: string): Promise<AccountCartResponse> {
  return toAccountCartResponse(await getRawUserCartItems(userId));
}

export async function addUserCartItem(
  userId: string,
  item: CartPriceItemInput
): Promise<AccountCartResponse> {
  const items = await runSerializableTransaction(async (tx) => {
    const existing = await tx.userCartItem.findUnique({
      where: {
        userId_productId_variantId: {
          userId,
          productId: item.productId,
          variantId: item.variantId
        }
      }
    });
    const nextQuantity = (existing?.quantity ?? 0) + item.quantity;

    await enrichCartItems([{ ...item, quantity: nextQuantity }], tx);

    await tx.userCartItem.upsert({
      where: {
        userId_productId_variantId: {
          userId,
          productId: item.productId,
          variantId: item.variantId
        }
      },
      create: {
        userId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: nextQuantity
      },
      update: {
        quantity: nextQuantity
      }
    });

    return getRawUserCartItems(userId, tx);
  });

  return toAccountCartResponse(items);
}

export async function updateUserCartItem(
  userId: string,
  item: CartPriceItemInput
): Promise<AccountCartResponse> {
  const items = await runSerializableTransaction(async (tx) => {
    await enrichCartItems([item], tx);

    await tx.userCartItem.upsert({
      where: {
        userId_productId_variantId: {
          userId,
          productId: item.productId,
          variantId: item.variantId
        }
      },
      create: {
        userId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity
      },
      update: {
        quantity: item.quantity
      }
    });

    return getRawUserCartItems(userId, tx);
  });

  return toAccountCartResponse(items);
}

export async function removeUserCartItem(
  userId: string,
  item: Pick<CartPriceItemInput, "productId" | "variantId">
): Promise<AccountCartResponse> {
  await prisma.userCartItem.deleteMany({
    where: {
      userId,
      productId: item.productId,
      variantId: item.variantId
    }
  });

  return getUserCartItems(userId);
}

export async function clearUserCartItems(userId: string): Promise<AccountCartResponse> {
  await prisma.userCartItem.deleteMany({ where: { userId } });
  return getUserCartItems(userId);
}

export async function mergeUserCartItems(
  userId: string,
  mergeId: string,
  incomingItems: CartPriceItemInput[]
): Promise<AccountCartResponse> {
  try {
    const items = await runSerializableTransaction(async (tx) => {
      await mergeOperationDb(tx).create({
        data: {
          userId,
          mergeId
        }
      });

      const normalizedItems = normalizeIncomingItems(incomingItems);
      const currentItems = await getRawUserCartItems(userId, tx);
      const currentByKey = new Map(currentItems.map((item) => [itemKey(item), item]));

      for (const item of normalizedItems) {
        const existing = currentByKey.get(itemKey(item));
        const nextQuantity = (existing?.quantity ?? 0) + item.quantity;
        const candidate = { ...item, quantity: nextQuantity };

        try {
          await enrichCartItems([candidate], tx);
        } catch {
          // Invalid guest entries should not enter the account cart.
          continue;
        }

        await tx.userCartItem.upsert({
          where: {
            userId_productId_variantId: {
              userId,
              productId: item.productId,
              variantId: item.variantId
            }
          },
          create: {
            userId,
            productId: item.productId,
            variantId: item.variantId,
            quantity: nextQuantity
          },
          update: {
            quantity: nextQuantity
          }
        });
      }

      await mergeOperationDb(tx).update({
        where: {
          userId_mergeId: {
            userId,
            mergeId
          }
        },
        data: {
          completedAt: new Date()
        }
      });

      return getRawUserCartItems(userId, tx);
    });

    void cleanupOldMergeOperations(userId);
    return toAccountCartResponse(items);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return getUserCartItems(userId);
    }
    throw error;
  }
}

export async function calculateCartPrice(input: CartPriceRequest): Promise<CartPriceResponse> {
  const enrichedItems = await enrichCartItems(input.items);

  const subtotal = enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const originalSubtotal = enrichedItems.reduce(
    (sum, item) => sum + item.compareAtUnitPrice * item.quantity,
    0
  );
  const baseSavings = Math.max(0, originalSubtotal - subtotal);

  const normalizedPromoCode = normalizePromoCode(input.promoCode);
  let promoDiscount = 0;
  let appliedPromoCode: string | null = null;

  if (normalizedPromoCode) {
    const couponResult = await validateAndCalculateCoupon({
      code: normalizedPromoCode,
      subtotal
    });

    promoDiscount = couponResult.discountAmount;
    appliedPromoCode = couponResult.code;
  }

  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  const gst = 0;
  const shipping =
    discountedSubtotal === 0 || discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = discountedSubtotal + shipping;
  const totalSavings = baseSavings + promoDiscount;

  return {
    data: {
      items: enrichedItems.map(({ variantDbId: _variantDbId, ...item }) => item),
      summary: {
        originalSubtotal,
        subtotal,
        baseSavings,
        promoCode: appliedPromoCode,
        promoDiscount,
        discountedSubtotal,
        gst,
        shipping,
        total,
        totalSavings,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - discountedSubtotal)
      }
    }
  };
}
