import type { Metadata } from "next";
import { CheckoutLoader } from "@/components/checkout/checkout-loader";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Add delivery details and review your Auraville order before payment.",
  alternates: {
    canonical: absoluteUrl("/checkout")
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function CheckoutPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Checkout</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Confirm delivery and payment.
        </h1>
      </div>
      <div className="mt-10">
        <CheckoutLoader />
      </div>
    </div>
  );
}
