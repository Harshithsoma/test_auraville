import type { Metadata } from "next";
import { OrdersClient } from "@/components/orders/orders-client";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View and track your Auraville orders.",
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
    <div className="container-page py-8 sm:py-10 md:py-14">
      <header className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--coral)]">Your account</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">My Orders</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)] sm:text-base">View and track all your orders.</p>
      </header>
      <OrdersClient />
    </div>
  );
}
