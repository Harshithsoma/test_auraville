"use client";

import dynamic from "next/dynamic";

const CheckoutClient = dynamic(() => import("@/components/checkout/checkout-client"), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-[var(--line)] bg-white p-8">Preparing checkout...</div>
});

export function CheckoutLoader() {
  return <CheckoutClient />;
}
