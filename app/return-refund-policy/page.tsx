import type { Metadata } from "next";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund Policy for Auraville",
  description:
    "Understand Auraville return and refund support for healthy snacks orders, wrong item delivery, damaged packs, and product quality concerns.",
  alternates: {
    canonical: absoluteUrl("/return-refund-policy")
  },
  openGraph: {
    title: "Refund Policy for Auraville",
    description:
      "Understand Auraville return and refund support for healthy snacks orders, wrong item delivery, damaged packs, and product quality concerns.",
    url: absoluteUrl("/return-refund-policy"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville return and refund policy" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Refund Policy for Auraville",
    description:
      "Understand Auraville return and refund support for healthy snacks orders, wrong item delivery, damaged packs, and product quality concerns.",
    images: [defaultShareImageUrl()]
  }
};

export default function ReturnRefundPolicyPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold">Return & Refund Policy</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        If there is a quality issue or wrong item delivery, we provide support through return and refund handling.
      </p>
    </div>
  );
}
