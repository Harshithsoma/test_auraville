"use client";

import Link from "next/link";
import { getCartCount, useCartStore } from "@/stores/cart-store";
import { useHasMounted } from "@/hooks/use-has-mounted";

export function CartStatus() {
  const hasMounted = useHasMounted();
  const items = useCartStore((state) => state.items);
  const count = hasMounted ? getCartCount(items) : 0;

  return (
    <Link
      aria-label={`Cart with ${count} items`}
      className="focus-ring relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white transition hover:border-[var(--leaf)]"
      href="/cart"
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 8h10l1 12H6L7 8Zm3 0V6a2 2 0 1 1 4 0v2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
      <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-[var(--coral)] px-1.5 py-0.5 text-center text-xs font-bold text-white">
        {count}
      </span>
    </Link>
  );
}
