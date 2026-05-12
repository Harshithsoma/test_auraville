import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "COD Terms & Conditions",
  alternates: {
    canonical: absoluteUrl("/cod-terms")
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
