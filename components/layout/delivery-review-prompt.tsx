"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

type VerifiedPromptResponse = {
  data: {
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string;
    orderId: string;
    orderItemId: string;
  } | null;
};

export function DeliveryReviewPrompt() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [prompt, setPrompt] = useState<VerifiedPromptResponse["data"]>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasHydrated || !user) {
      return;
    }

    let isCancelled = false;
    void commerceApi.reviews
      .verifiedPrompt<VerifiedPromptResponse>()
      .then((response) => {
        if (!isCancelled) {
          setPrompt(response.data);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPrompt(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [hasHydrated, user]);

  if (!user || !prompt) {
    return null;
  }

  return (
    <div className="border-b border-[var(--line)] bg-[var(--mint)]/40">
      <div className="container-page flex flex-wrap items-center justify-between gap-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--leaf-deep)]">
            How was your {prompt.productName}?
          </p>
          <p className="text-xs text-[var(--muted)]">Choose a star rating first. Written review is optional.</p>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const rating = index + 1;
            return (
              <button
                aria-label={`Rate ${rating} stars`}
                className="focus-ring text-xl leading-none text-[var(--gold)] transition hover:scale-105"
                disabled={isSaving}
                key={rating}
                type="button"
                onClick={() => {
                  setIsSaving(true);
                  setMessage("");
                  void commerceApi.reviews
                    .verifiedRate<{ data: { reviewId: string; message: string } }, { orderId: string; orderItemId: string; productId: string; rating: number }>({
                      orderId: prompt.orderId,
                      orderItemId: prompt.orderItemId,
                      productId: prompt.productId,
                      rating
                    })
                    .then((response) => {
                      setMessage(response.data.message);
                      setPrompt(null);
                    })
                    .catch((error) => {
                      if (error instanceof ApiError) {
                        setMessage(error.message);
                      } else {
                        setMessage("Unable to save rating right now.");
                      }
                    })
                    .finally(() => {
                      setIsSaving(false);
                    });
                }}
              >
                ★
              </button>
            );
          })}
          <Link className="focus-ring ml-1 rounded-lg text-xs font-semibold text-[var(--leaf-deep)] underline" href="/orders">
            Add text review
          </Link>
        </div>
      </div>
      {message ? (
        <div className="container-page pb-2">
          <p className="text-xs font-semibold text-[var(--leaf-deep)]">{message}</p>
        </div>
      ) : null}
    </div>
  );
}
