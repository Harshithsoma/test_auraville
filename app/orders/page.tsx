import type { Metadata } from "next";
import { OrdersClient } from "@/components/orders/orders-client";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Orders",
  description: "View your current and past Auraville orders.",
  alternates: {
    canonical: absoluteUrl("/orders")
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function OrdersPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Orders</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Current and past orders.
        </h1>
      </div>
      <OrdersClient />
    </div>
  );
}
