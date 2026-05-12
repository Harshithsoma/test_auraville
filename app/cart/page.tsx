import type { Metadata } from "next";
import { CartLoader } from "@/components/cart/cart-loader";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review selected Auraville products, update quantities, and continue to checkout.",
  alternates: {
    canonical: absoluteUrl("/cart")
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function CartPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Cart</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Your Auraville shelf.</h1>
      </div>
      <div className="mt-10">
        <CartLoader />
      </div>
    </div>
  );
}
