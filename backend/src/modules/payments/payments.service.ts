import { createHash, createHmac, timingSafeEqual } from "crypto";
import { env } from "../../config/env";
import { prisma } from "../../prisma/prisma.service";
import { HttpError } from "../../utils/http-error";
import type {
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  RazorpayWebhookResponse
} from "./payments.types";

type ConfirmOrderPaymentParams = {
  orderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  rawPayload?: unknown;
  failIfAlreadyConfirmed: boolean;
};

type ConfirmOrderPaymentResult = {
  orderId: string;
  alreadyProcessed: boolean;
};

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        notes?: {
          orderId?: string;
        };
        error_description?: string | null;
      };
    };
    order?: {
      entity?: {
        id?: string;
        notes?: {
          orderId?: string;
        };
      };
    };
  };
};

function buildHexHmacSha256(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function signaturesMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function ensureValidPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): void {
  const signedPayload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expectedSignature = buildHexHmacSha256(signedPayload, env.RAZORPAY_KEY_SECRET);

  if (!signaturesMatch(expectedSignature, input.razorpaySignature)) {
    throw new HttpError(400, "Invalid payment signature", undefined, "INVALID_PAYMENT_SIGNATURE");
  }
}

function ensureValidWebhookSignature(rawBody: Buffer, providedSignature: string | undefined): void {
  if (!providedSignature) {
    throw new HttpError(400, "Missing webhook signature", undefined, "INVALID_WEBHOOK_SIGNATURE");
  }

  const expectedSignature = buildHexHmacSha256(rawBody.toString("utf8"), env.RAZORPAY_WEBHOOK_SECRET);

  if (!signaturesMatch(expectedSignature, providedSignature)) {
    throw new HttpError(400, "Invalid webhook signature", undefined, "INVALID_WEBHOOK_SIGNATURE");
  }
}

function extractWebhookEventId(params: {
  headerEventId?: string;
  rawBody: Buffer;
  payload: RazorpayWebhookPayload;
}): string {
  if (params.headerEventId && params.headerEventId.trim().length > 0) {
    return params.headerEventId.trim();
  }

  const paymentId = params.payload.payload?.payment?.entity?.id;
  const eventType = params.payload.event ?? "unknown";
  const createdAt = params.payload.created_at ?? 0;

  if (paymentId) {
    return `fallback:${eventType}:${paymentId}:${createdAt}`;
  }

  const bodyHash = createHash("sha256").update(params.rawBody).digest("hex");
  return `fallback:${eventType}:${bodyHash}`;
}

async function confirmOrderPayment(
  params: ConfirmOrderPaymentParams
): Promise<ConfirmOrderPaymentResult> {
  return prisma.$transaction(
    async (tx: any) => {
      const order = params.orderId
        ? await tx.order.findUnique({
            where: { id: params.orderId },
            include: {
              payment: true,
              items: {
                select: {
                  id: true,
                  variantDbId: true,
                  variantId: true,
                  quantity: true
                }
              }
            }
          })
        : await tx.order.findUnique({
            where: { razorpayOrderId: params.razorpayOrderId },
            include: {
              payment: true,
              items: {
                select: {
                  id: true,
                  variantDbId: true,
                  variantId: true,
                  quantity: true
                }
              }
            }
          });

      if (!order) {
        throw new HttpError(404, "Order not found", undefined, "ORDER_NOT_FOUND");
      }

      if (!order.payment) {
        throw new HttpError(400, "Payment not initialized for order", undefined, "PAYMENT_NOT_FOUND");
      }

      if (order.razorpayOrderId !== params.razorpayOrderId) {
        throw new HttpError(
          400,
          "Razorpay order mismatch",
          {
            orderId: order.id,
            expectedRazorpayOrderId: order.razorpayOrderId,
            receivedRazorpayOrderId: params.razorpayOrderId
          },
          "PAYMENT_MISMATCH"
        );
      }

      if (order.payment.razorpayOrderId !== params.razorpayOrderId) {
        throw new HttpError(
          400,
          "Razorpay payment mismatch",
          {
            orderId: order.id,
            expectedRazorpayOrderId: order.payment.razorpayOrderId,
            receivedRazorpayOrderId: params.razorpayOrderId
          },
          "PAYMENT_MISMATCH"
        );
      }

      if (order.status === "confirmed" && order.payment.status === "paid") {
        if (params.failIfAlreadyConfirmed) {
          throw new HttpError(
            409,
            "Payment already confirmed for this order",
            { orderId: order.id },
            "PAYMENT_ALREADY_CONFIRMED"
          );
        }

        return {
          orderId: order.id,
          alreadyProcessed: true
        };
      }

      if (order.payment.status === "paid") {
        if (order.status !== "confirmed") {
          await recordCouponUsageForPaidOrder({
            tx,
            order
          });

          await tx.order.update({
            where: { id: order.id },
            data: { status: "confirmed" }
          });
        }

        return {
          orderId: order.id,
          alreadyProcessed: true
        };
      }

      if (order.status === "confirmed") {
        throw new HttpError(
          409,
          "Order is already confirmed with inconsistent payment status",
          { orderId: order.id, paymentStatus: order.payment.status },
          "PAYMENT_STATE_CONFLICT"
        );
      }

      await recordCouponUsageForPaidOrder({
        tx,
        order
      });

      for (const item of order.items) {
        const updated = await tx.productVariant.updateMany({
          where: {
            id: item.variantDbId,
            stock: {
              gte: item.quantity
            }
          },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });

        if (updated.count !== 1) {
          throw new HttpError(
            409,
            "Insufficient stock during payment verification",
            {
              orderId: order.id,
              orderItemId: item.id,
              variantId: item.variantId,
              requestedQuantity: item.quantity
            },
            "INSUFFICIENT_STOCK"
          );
        }
      }

      const paymentUpdateData: Record<string, unknown> = {
        status: "paid",
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature
      };

      if (params.rawPayload !== undefined) {
        paymentUpdateData.rawPayload = params.rawPayload;
      }

      await tx.payment.update({
        where: { id: order.payment.id },
        data: paymentUpdateData
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "confirmed" }
      });

      return {
        orderId: order.id,
        alreadyProcessed: false
      };
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

async function markPaymentFailedFromWebhook(params: {
  razorpayOrderId: string;
  rawPayload: unknown;
}): Promise<void> {
  await prisma.$transaction(
    async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { razorpayOrderId: params.razorpayOrderId },
        include: {
          payment: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

      if (!order || !order.payment) {
        throw new HttpError(404, "Order not found", undefined, "ORDER_NOT_FOUND");
      }

      if (order.payment.status === "paid" && order.status === "confirmed") {
        return;
      }

      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: "failed",
          rawPayload: params.rawPayload
        }
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "payment_failed"
        }
      });
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

function parseWebhookPayload(rawBody: Buffer): RazorpayWebhookPayload {
  try {
    const parsed = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookPayload;
    return parsed;
  } catch {
    throw new HttpError(400, "Invalid webhook payload", undefined, "INVALID_WEBHOOK_PAYLOAD");
  }
}

function parseOrderIdHint(payload: RazorpayWebhookPayload): string | undefined {
  const orderNotesValue = payload.payload?.order?.entity?.notes?.orderId;
  if (typeof orderNotesValue === "string" && orderNotesValue.trim().length > 0) {
    return orderNotesValue.trim();
  }

  const paymentNotesValue = payload.payload?.payment?.entity?.notes?.orderId;
  if (typeof paymentNotesValue === "string" && paymentNotesValue.trim().length > 0) {
    return paymentNotesValue.trim();
  }

  return undefined;
}

async function recordCouponUsageForPaidOrder(params: {
  tx: any;
  order: {
    id: string;
    couponCode: string | null;
    userId: string | null;
    email: string;
  };
}): Promise<void> {
  const couponCode = params.order.couponCode?.trim();

  if (!couponCode) {
    return;
  }

  const coupon = await params.tx.coupon.findUnique({
    where: { code: couponCode },
    select: {
      id: true,
      code: true,
      usageLimit: true,
      usageLimitPerUser: true
    }
  });

  if (!coupon) {
    throw new HttpError(
      409,
      "Applied coupon is no longer available",
      { orderId: params.order.id, couponCode },
      "COUPON_NOT_FOUND"
    );
  }

  const existingUsage = await params.tx.couponUsage.findFirst({
    where: {
      couponId: coupon.id,
      orderId: params.order.id
    },
    select: { id: true }
  });

  if (existingUsage) {
    return;
  }

  if (coupon.usageLimitPerUser !== null) {
    if (params.order.userId) {
      const usageCount = await params.tx.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId: params.order.userId
        }
      });

      if (usageCount >= coupon.usageLimitPerUser) {
        throw new HttpError(
          409,
          "Coupon usage limit exceeded",
          {
            orderId: params.order.id,
            couponCode: coupon.code
          },
          "COUPON_USAGE_LIMIT_EXCEEDED"
        );
      }
    } else {
      const usageCount = await params.tx.couponUsage.count({
        where: {
          couponId: coupon.id,
          email: params.order.email.toLowerCase()
        }
      });

      if (usageCount >= coupon.usageLimitPerUser) {
        throw new HttpError(
          409,
          "Coupon usage limit exceeded",
          {
            orderId: params.order.id,
            couponCode: coupon.code
          },
          "COUPON_USAGE_LIMIT_EXCEEDED"
        );
      }
    }
  }

  if (coupon.usageLimit !== null) {
    const updated = await params.tx.coupon.updateMany({
      where: {
        id: coupon.id,
        usedCount: {
          lt: coupon.usageLimit
        }
      },
      data: {
        usedCount: {
          increment: 1
        }
      }
    });

    if (updated.count !== 1) {
      throw new HttpError(
        409,
        "Coupon usage limit exceeded",
        {
          orderId: params.order.id,
          couponCode: coupon.code
        },
        "COUPON_USAGE_LIMIT_EXCEEDED"
      );
    }
  } else {
    await params.tx.coupon.update({
      where: { id: coupon.id },
      data: {
        usedCount: {
          increment: 1
        }
      }
    });
  }

  await params.tx.couponUsage.create({
    data: {
      couponId: coupon.id,
      userId: params.order.userId,
      email: params.order.email.toLowerCase(),
      orderId: params.order.id
    }
  });
}

export async function verifyPayment(input: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
  ensureValidPaymentSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature
  });

  const result = await confirmOrderPayment({
    orderId: input.orderId,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
    rawPayload: {
      source: "verify",
      verifiedAt: new Date().toISOString(),
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId
    },
    failIfAlreadyConfirmed: true
  });

  return {
    data: {
      orderId: result.orderId,
      status: "confirmed",
      paymentStatus: "paid"
    }
  };
}


export async function processRazorpayWebhook(params: {
  rawBody: Buffer;
  signatureHeader?: string;
  eventIdHeader?: string;
}): Promise<RazorpayWebhookResponse> {
  ensureValidWebhookSignature(params.rawBody, params.signatureHeader);

  const payload = parseWebhookPayload(params.rawBody);
  const eventType = payload.event;

  if (!eventType) {
    throw new HttpError(400, "Missing webhook event type", undefined, "INVALID_WEBHOOK_PAYLOAD");
  }

  const webhookEventId = extractWebhookEventId({
    headerEventId: params.eventIdHeader,
    rawBody: params.rawBody,
    payload
  });

  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        razorpayEventId: webhookEventId,
        eventType,
        payload
      }
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        data: {
          received: true,
          event: eventType,
          idempotent: true
        }
      };
    }

    throw error;
  }

  const razorpayOrderId = payload.payload?.payment?.entity?.order_id ?? payload.payload?.order?.entity?.id;
  const razorpayPaymentId = payload.payload?.payment?.entity?.id;
  const orderIdHint = parseOrderIdHint(payload);

  try {
    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        if (!razorpayOrderId || !razorpayPaymentId) {
          throw new HttpError(
            400,
            "Webhook missing payment/order identifiers",
            { eventType },
            "INVALID_WEBHOOK_PAYLOAD"
          );
        }

        await confirmOrderPayment({
          orderId: orderIdHint,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: params.signatureHeader,
          rawPayload: payload,
          failIfAlreadyConfirmed: false
        });
        break;
      }

      case "payment.failed": {
        if (!razorpayOrderId) {
          throw new HttpError(
            400,
            "Webhook missing Razorpay order id",
            { eventType },
            "INVALID_WEBHOOK_PAYLOAD"
          );
        }

        await markPaymentFailedFromWebhook({
          razorpayOrderId,
          rawPayload: payload
        });
        break;
      }

      default:
        break;
    }

    await prisma.paymentWebhookEvent.update({
      where: { razorpayEventId: webhookEventId },
      data: {
        processedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.paymentWebhookEvent.deleteMany({
      where: {
        razorpayEventId: webhookEventId,
        processedAt: null
      }
    });

    throw error;
  }

  return {
    data: {
      received: true,
      event: eventType,
      idempotent: false
    }
  };
}
