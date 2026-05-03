"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/price";

type BackendOrderItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
};

type BackendOrder = {
  id: string;
  email: string;
  items: BackendOrderItem[];
  total: number;
  status: string;
  createdAt: string;
};

type OrdersListResponse = {
  data: BackendOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function OrdersClient() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await commerceApi.orders.list<OrdersListResponse>({ page: 1, limit: 20 });
      setOrders(response.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load orders right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    void loadOrders();
  }, [loadOrders, user]);

  if (!hasMounted || isHydrating) {
    return <div className="rounded-lg border border-[var(--line)] bg-white p-8">Loading orders...</div>;
  }

  if (!user && hasHydrated) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold">Login to view orders.</h1>
        <p className="mt-3 text-[var(--muted)]">Past and pending orders are linked to your account email.</p>
        <Button className="mt-6" href="/auth?next=/orders">
          Login
        </Button>
      </section>
    );
  }

  if (isLoading) {
    return <div className="rounded-lg border border-[var(--line)] bg-white p-8">Loading your orders...</div>;
  }

  if (errorMessage) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">We could not load your orders.</h1>
        <p className="mt-3 text-[var(--muted)]">{errorMessage}</p>
        <Button
          className="mt-6"
          type="button"
          onClick={() => {
            void loadOrders();
          }}
        >
          Retry
        </Button>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold">No orders yet.</h1>
        <p className="mt-3 text-[var(--muted)]">Your palmyra sprout orders will appear here after checkout.</p>
        <Button className="mt-6" href="/product/palmyra-sprout-energy-bar">
          Shop best selling
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Your orders">
      {orders.map((order) => (
        <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={order.id}>
          <div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Order {order.id}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(order.createdAt))}
              </p>
            </div>
            <span className="w-fit rounded-full bg-[var(--mint)] px-3 py-1 text-sm font-bold capitalize text-[var(--leaf-deep)]">
              {order.status}
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {order.items.map((item) => (
              <li className="flex justify-between gap-4 text-sm" key={`${order.id}-${item.productId}-${item.variantId}`}>
                <Link className="focus-ring rounded-lg font-semibold" href={`/product/${item.slug}`}>
                  {item.quantity} x {item.name} ({item.variantLabel})
                </Link>
                <span>{formatPrice(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--line)] pt-4 text-right font-semibold">
            Total {formatPrice(order.total)}
          </p>
        </article>
      ))}
    </section>
  );
}
