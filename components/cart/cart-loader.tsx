"use client";

import dynamic from "next/dynamic";

const CartClient = dynamic(() => import("@/components/cart/cart-client"), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-[var(--line)] bg-white p-8">Loading cart...</div>
});

export function CartLoader() {
  return <CartClient />;
}
