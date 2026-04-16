"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useOrderStore } from "@/stores/order-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/price";

export function OrdersClient() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const orders = useOrderStore((state) => state.orders);
  const visibleOrders = user ? orders.filter((order) => !order.email || order.email === user.email) : [];

  if (!hasMounted) {
    return <div className="rounded-lg border border-[var(--line)] bg-white p-8">Loading orders...</div>;
  }

  if (!user) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold">Login to view orders.</h1>
        <p className="mt-3 text-[var(--muted)]">Past and pending orders are linked to your account email.</p>
        <Button className="mt-6" href="/auth">
          Login
        </Button>
      </section>
    );
  }

  if (visibleOrders.length === 0) {
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
      {visibleOrders.map((order) => (
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
