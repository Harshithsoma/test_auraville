import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  alternates: {
    canonical: absoluteUrl("/cancellation-policy")
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
