import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  alternates: {
    canonical: absoluteUrl("/return-refund-policy")
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
