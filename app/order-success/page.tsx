import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderSuccessClient } from "@/components/checkout/order-success-client";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Order Success",
  description: "Your Auraville order has been confirmed.",
  alternates: {
    canonical: absoluteUrl("/order-success")
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function OrderSuccessPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <Suspense fallback={<div className="rounded-lg border border-[var(--line)] bg-white p-8">Loading order...</div>}>
        <OrderSuccessClient />
      </Suspense>
    </div>
  );
}
