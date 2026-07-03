import type { Metadata } from "next";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shipping Policy for Auraville",
  description:
    "See Auraville shipping timelines, dispatch process, and delivery serviceability for healthy snacks and Palmyra Sprouts orders across India.",
  alternates: {
    canonical: absoluteUrl("/shipping-policy")
  },
  openGraph: {
    title: "Shipping Policy for Auraville",
    description:
      "See Auraville shipping timelines, dispatch process, and delivery serviceability for healthy snacks and Palmyra Sprouts orders across India.",
    url: absoluteUrl("/shipping-policy"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville shipping policy" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Shipping Policy for Auraville",
    description:
      "See Auraville shipping timelines, dispatch process, and delivery serviceability for healthy snacks and Palmyra Sprouts orders across India.",
    images: [defaultShareImageUrl()]
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
