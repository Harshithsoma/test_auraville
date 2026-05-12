"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function ReviewMailer() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !review.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const trimmedReview = review.trim();
      const subject = trimmedReview.slice(0, 60) || "General feedback";

      const response = await commerceApi.reviews.create<
        { data: { id: string; message: string } },
        { rating: number; subject: string; body: string; productId?: string }
      >({
        rating: 5,
        subject,
        body: trimmedReview
      });

      setReview("");
      setMessage(response.data.message || "Review submitted for approval.");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Unable to submit review right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasMounted) {
    return <p className="text-sm text-[var(--muted)]">Loading review form...</p>;
  }

  if (!user) {
    return (
      <div>
        <p className="text-sm leading-6 text-[var(--muted)]">
          Login to send us a review from your account email.
        </p>
        <Link className="focus-ring mt-3 inline-block rounded-lg text-sm font-semibold text-[var(--leaf-deep)]" href="/auth?next=/">
          Login to review
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void sendReview(event)}>
      <Textarea
        aria-label="Write your review"
        placeholder="Write your review..."
        value={review}
        onChange={(event) => {
          setReview(event.target.value);
          setMessage(null);
        }}
      />
      <Button className="w-full" disabled={!review.trim() || isSubmitting} type="submit" variant="secondary">
        {isSubmitting ? "Submitting..." : "Send review"}
      </Button>
      {message ? <p className="text-xs font-semibold text-[var(--leaf-deep)]">{message}</p> : null}
    </form>
  );
}
