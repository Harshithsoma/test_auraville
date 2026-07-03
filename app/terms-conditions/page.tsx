import type { Metadata } from "next";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms for Auraville Orders",
  description:
    "Review Auraville terms for buying healthy snacks online, including product information, orders, payments, delivery, and customer responsibilities.",
  alternates: {
    canonical: absoluteUrl("/terms-conditions")
  },
  openGraph: {
    title: "Terms for Auraville Orders",
    description:
      "Review Auraville terms for buying healthy snacks online, including product information, orders, payments, delivery, and customer responsibilities.",
    url: absoluteUrl("/terms-conditions"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville terms and conditions" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms for Auraville Orders",
    description:
      "Review Auraville terms for buying healthy snacks online, including product information, orders, payments, delivery, and customer responsibilities.",
    images: [defaultShareImageUrl()]
  }
};

export default function TermsConditionsPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold">Terms & Conditions</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Use of this site and orders placed are subject to Auraville terms, policies, and applicable laws.
      </p>
    </div>
  );
}
