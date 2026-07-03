import type { Metadata } from "next";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy for Auraville",
  description:
    "Read how Auraville handles customer data for healthy snacks orders, delivery, support, account access, and service updates across India.",
  alternates: {
    canonical: absoluteUrl("/privacy-policy")
  },
  openGraph: {
    title: "Privacy Policy for Auraville",
    description:
      "Read how Auraville handles customer data for healthy snacks orders, delivery, support, account access, and service updates across India.",
    url: absoluteUrl("/privacy-policy"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville privacy policy" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy for Auraville",
    description:
      "Read how Auraville handles customer data for healthy snacks orders, delivery, support, account access, and service updates across India.",
    images: [defaultShareImageUrl()]
  }
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        We handle customer data responsibly and only for order processing, support, and service updates.
      </p>
    </div>
  );
}
