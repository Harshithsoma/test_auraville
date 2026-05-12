import { prisma } from "../../prisma/prisma.service";
import { HttpError } from "../../utils/http-error";
import type { OrderDetailResponse, OrderItemView, OrdersListQuery, OrdersListResponse } from "./orders.types";

function mapOrderItems(
  items: Array<{
    productId: string;
    slug: string;
    name: string;
    image: string;
    variantId: string;
    variantLabel: string;
    unitPrice: number;
    quantity: number;
  }>
): OrderItemView[] {
  return items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    image: item.image,
    variantId: item.variantId,
    variantLabel: item.variantLabel,
    unitPrice: item.unitPrice,
    quantity: item.quantity
  }));
}

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
        total: true,
        status: true,
        createdAt: true,
        items: {
          select: {
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

  return {
    data: orders.map((order: {
      id: string;
      email: string;
      total: number;
      status: "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "payment_failed";
      createdAt: Date;
      items: Array<{
        productId: string;
        slug: string;
        name: string;
        image: string;
        variantId: string;
        variantLabel: string;
        unitPrice: number;
        quantity: number;
      }>;
    }) => ({
      id: order.id,
      email: order.email,
      items: mapOrderItems(order.items),
      total: order.total,
      status: order.status,
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
      subtotal: true,
      couponDiscount: true,
      gst: true,
      shipping: true,
      total: true,
      status: true,
      createdAt: true,
      items: {
        select: {
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

  return {
    data: {
      id: order.id,
      email: order.email,
      items: mapOrderItems(order.items),
      pricing: {
        subtotal: order.subtotal,
        promoDiscount: order.couponDiscount,
        gst: order.gst,
        shipping: order.shipping,
        total: order.total
      },
      status: order.status,
      createdAt: order.createdAt.toISOString()
    }
  };
}
