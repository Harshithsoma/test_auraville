import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: {
    canonical: absoluteUrl("/privacy-policy")
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
