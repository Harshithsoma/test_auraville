import type { Metadata } from "next";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cancellation Policy for Auraville",
  description:
    "Learn when Auraville healthy snacks orders can be cancelled before dispatch and how to contact support with your order reference.",
  alternates: {
    canonical: absoluteUrl("/cancellation-policy")
  },
  openGraph: {
    title: "Cancellation Policy for Auraville",
    description:
      "Learn when Auraville healthy snacks orders can be cancelled before dispatch and how to contact support with your order reference.",
    url: absoluteUrl("/cancellation-policy"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville cancellation policy" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Cancellation Policy for Auraville",
    description:
      "Learn when Auraville healthy snacks orders can be cancelled before dispatch and how to contact support with your order reference.",
    images: [defaultShareImageUrl()]
  }
};

export default function CancellationPolicyPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold">Cancellation Policy</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Orders can be cancelled before dispatch. Please contact support with your order reference.
      </p>
    </div>
  );
}
