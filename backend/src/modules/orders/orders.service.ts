import { prisma } from "../../prisma/prisma.service";
import { HttpError } from "../../utils/http-error";
import type {
  CustomerOrderPaymentView,
  CustomerOrderPricingView,
  CustomerShippingAddressView,
  OrderDetailResponse,
  OrderItemView,
  OrdersListQuery,
  OrdersListResponse,
  PaymentStatusView
} from "./orders.types";

type OrderItemRecord = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
};

type OrderSnapshotRecord = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  pincode: string;
  country: string;
  originalSubtotal: number;
  subtotal: number;
  baseSavings: number;
  couponCode: string | null;
  couponDiscount: number;
  gst: number;
  shipping: number;
  total: number;
  payment: { status: PaymentStatusView } | null;
};

function mapOrderItems(
  items: OrderItemRecord[],
  reviewsByOrderItemId: Map<string, { id: string; rating: number; subject: string | null; body: string }>
): OrderItemView[] {
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    image: item.image,
    variantId: item.variantId,
    variantLabel: item.variantLabel,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    canRate: true,
    verifiedReview: reviewsByOrderItemId.has(item.id)
      ? {
          reviewId: reviewsByOrderItemId.get(item.id)!.id,
          rating: reviewsByOrderItemId.get(item.id)!.rating,
          subject: reviewsByOrderItemId.get(item.id)!.subject,
          body: reviewsByOrderItemId.get(item.id)!.body
        }
      : null
  }));
}

function mapOrderPricing(order: OrderSnapshotRecord): CustomerOrderPricingView {
  return {
    originalSubtotal: order.originalSubtotal,
    subtotal: order.subtotal,
    baseSavings: order.baseSavings,
    couponCode: order.couponCode,
    couponDiscount: order.couponDiscount,
    promoDiscount: order.couponDiscount,
    gst: order.gst,
    shipping: order.shipping,
    total: order.total
  };
}

function mapShippingAddress(order: OrderSnapshotRecord): CustomerShippingAddressView {
  return {
    name: order.name,
    phone: order.phone,
    addressLine1: order.addressLine1,
    addressLine2: order.addressLine2,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    country: order.country
  };
}

function mapPayment(payment: OrderSnapshotRecord["payment"]): CustomerOrderPaymentView {
  return payment ? { provider: "Razorpay", status: payment.status } : null;
}

const orderSnapshotSelect = {
  name: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  pincode: true,
  country: true,
  originalSubtotal: true,
  subtotal: true,
  baseSavings: true,
  couponCode: true,
  couponDiscount: true,
  gst: true,
  shipping: true,
  total: true,
  payment: {
    select: {
      status: true
    }
  }
} as const;

export async function listUserOrders(params: {
  userId: string;
  query: OrdersListQuery;
}): Promise<OrdersListResponse> {
  const { userId, query } = params;

  const where = {
    userId
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id: true,
        email: true,
        status: true,
        fulfillmentStage: true,
        createdAt: true,
        ...orderSnapshotSelect,
        items: {
          select: {
            id: true,
            productId: true,
            slug: true,
            name: true,
            image: true,
            variantId: true,
            variantLabel: true,
            unitPrice: true,
            quantity: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  const deliveredOrderItemIds = orders
    .filter((order) => order.status === "delivered")
    .flatMap((order) => order.items.map((item) => item.id));

  const verifiedReviews = deliveredOrderItemIds.length
    ? await prisma.review.findMany({
        where: {
          userId,
          isVerifiedPurchase: true,
          orderItemId: {
            in: deliveredOrderItemIds
          }
        },
        select: {
          id: true,
          orderItemId: true,
          rating: true,
          subject: true,
          body: true
        }
      })
    : [];

  const reviewsByOrderItemId = new Map(
    verifiedReviews
      .filter((review) => Boolean(review.orderItemId))
      .map((review) => [
        review.orderItemId as string,
        {
          id: review.id,
          rating: review.rating,
          subject: review.subject,
          body: review.body
        }
      ])
  );

  return {
    data: orders.map((order) => ({
      id: order.id,
      email: order.email,
      items: mapOrderItems(
        order.items,
        order.status === "delivered" ? reviewsByOrderItemId : new Map()
      ).map((item) => ({
        ...item,
        canRate: order.status === "delivered"
      })),
      pricing: mapOrderPricing(order as OrderSnapshotRecord),
      shippingAddress: mapShippingAddress(order as OrderSnapshotRecord),
      payment: mapPayment((order as OrderSnapshotRecord).payment),
      total: order.total,
      status: order.status,
      fulfillmentStage: order.fulfillmentStage,
      createdAt: order.createdAt.toISOString()
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
    }
  };
}

export async function getUserOrderById(params: {
  userId: string;
  orderId: string;
}): Promise<OrderDetailResponse> {
  const { userId, orderId } = params;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId
    },
    select: {
      id: true,
      email: true,
      status: true,
      fulfillmentStage: true,
      createdAt: true,
      ...orderSnapshotSelect,
      items: {
        select: {
          id: true,
          productId: true,
          slug: true,
          name: true,
          image: true,
          variantId: true,
          variantLabel: true,
          unitPrice: true,
          quantity: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!order) {
    throw new HttpError(404, "Order not found", undefined, "ORDER_NOT_FOUND");
  }

  const itemIds = order.items.map((item) => item.id);
  const verifiedReviews = itemIds.length
    ? await prisma.review.findMany({
        where: {
          userId,
          isVerifiedPurchase: true,
          orderItemId: {
            in: itemIds
          }
        },
        select: {
          id: true,
          orderItemId: true,
          rating: true,
          subject: true,
          body: true
        }
      })
    : [];
  const reviewsByOrderItemId = new Map(
    verifiedReviews
      .filter((review) => Boolean(review.orderItemId))
      .map((review) => [
        review.orderItemId as string,
        {
          id: review.id,
          rating: review.rating,
          subject: review.subject,
          body: review.body
        }
      ])
  );

  return {
    data: {
      id: order.id,
      email: order.email,
      items: mapOrderItems(
        order.items,
        order.status === "delivered" ? reviewsByOrderItemId : new Map()
      ).map((item) => ({
        ...item,
        canRate: order.status === "delivered"
      })),
      pricing: mapOrderPricing(order as OrderSnapshotRecord),
      shippingAddress: mapShippingAddress(order as OrderSnapshotRecord),
      payment: mapPayment((order as OrderSnapshotRecord).payment),
      status: order.status,
      fulfillmentStage: order.fulfillmentStage,
      createdAt: order.createdAt.toISOString()
    }
  };
}
