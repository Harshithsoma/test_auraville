"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

type VerifyFromLinkResponse = {
  data: {
    reviewId: string;
    message: string;
    productSlug: string;
  };
};

type SaveTextResponse = {
  data: {
    reviewId: string;
    message: string;
  };
};

export function ReviewFromLinkClient() {
  const params = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("Validating your review link...");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [productSlug, setProductSlug] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const ratingRaw = params.get("rating");
    const rating = ratingRaw ? Number(ratingRaw) : NaN;

    if (!token || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      setMessage("This review link is invalid or incomplete.");
      return;
    }

    let isCancelled = false;
    setIsSubmitting(true);
    setLinkToken(token);

    void commerceApi.reviews
      .verifiedFromLink<VerifyFromLinkResponse, { token: string; rating: number }>({
        token,
        rating
      })
      .then((response) => {
        if (isCancelled) return;
        setReviewId(response.data.reviewId);
        setProductSlug(response.data.productSlug);
        setMessage(response.data.message);
      })
      .catch((error) => {
        if (isCancelled) return;
        if (error instanceof ApiError) {
          setMessage(error.message);
          return;
        }
        setMessage("Unable to process this review link right now.");
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSubmitting(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [params]);

  async function submitOptionalText() {
    if (!reviewId) {
      return;
    }

    if (!subject.trim() && !body.trim()) {
      setMessage("You can leave this blank, or add subject/review text.");
      return;
    }

    if (!linkToken) {
      setMessage("This review link is invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await commerceApi.reviews.verifiedFromLinkText<
        SaveTextResponse,
        { token: string; reviewId: string; subject?: string; body?: string }
      >({
        token: linkToken,
        reviewId,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined
      });
      setMessage(response.data.message);
      setSubject("");
      setBody("");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Unable to save review text right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container-page py-12 md:py-16">
      <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold">Rate your delivered product</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Your star rating is saved first. Optional written feedback can be added below.
        </p>
        <p className="mt-4 text-sm font-semibold text-[var(--leaf-deep)]" role="status" aria-live="polite">
          {message}
        </p>

        {reviewId ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Subject (optional)</span>
              <Input
                className="mt-2"
                maxLength={160}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Review (optional)</span>
              <Textarea
                className="mt-2 min-h-28"
                maxLength={5000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={isSubmitting} onClick={() => void submitOptionalText()}>
                {isSubmitting ? "Saving..." : "Save optional review text"}
              </Button>
              {productSlug ? (
                <Button type="button" variant="secondary" href={`/product/${productSlug}`}>
                  Back to product
                </Button>
              ) : null}
              <Button type="button" variant="secondary" href="/orders">
                Go to my orders
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
