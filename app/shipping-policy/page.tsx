import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shipping Policy",
  alternates: {
    canonical: absoluteUrl("/shipping-policy")
  }
};

export default function ShippingPolicyPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold">Shipping Policy</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Orders are dispatched promptly and shipping timelines vary by destination pin code.
      </p>
    </div>
  );
}
