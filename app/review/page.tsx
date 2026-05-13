import { Suspense } from "react";
import { ReviewFromLinkClient } from "@/components/review/review-from-link-client";

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-12 md:py-16">
          <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
            Validating your review link...
          </section>
        </div>
      }
    >
      <ReviewFromLinkClient />
    </Suspense>
  );
}
