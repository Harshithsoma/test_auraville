import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  alternates: {
    canonical: absoluteUrl("/terms-conditions")
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
