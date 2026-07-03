import type { Metadata } from "next";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "COD Terms for Auraville Orders",
  description:
    "Check Auraville Cash on Delivery terms, serviceability, eligibility, and order value conditions for healthy snacks shipped in India.",
  alternates: {
    canonical: absoluteUrl("/cod-terms")
  },
  openGraph: {
    title: "COD Terms for Auraville Orders",
    description:
      "Check Auraville Cash on Delivery terms, serviceability, eligibility, and order value conditions for healthy snacks shipped in India.",
    url: absoluteUrl("/cod-terms"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville cash on delivery terms" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "COD Terms for Auraville Orders",
    description:
      "Check Auraville Cash on Delivery terms, serviceability, eligibility, and order value conditions for healthy snacks shipped in India.",
    images: [defaultShareImageUrl()]
  }
};

export default function CodTermsPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold">COD Terms & Conditions</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Cash on Delivery availability depends on serviceability and order value thresholds.
      </p>
    </div>
  );
}
