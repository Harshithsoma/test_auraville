"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function ReviewMailer() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const [review, setReview] = useState("");

  function sendReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !review.trim()) return;

    const subject = encodeURIComponent(`Auraville review from ${user.email}`);
    const body = encodeURIComponent(`Logged in user: ${user.email}\n\nReview:\n${review.trim()}`);
    window.location.href = `mailto:admin@auraville.in?subject=${subject}&body=${body}`;
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
        <Link className="focus-ring mt-3 inline-block rounded-lg text-sm font-semibold text-[var(--leaf-deep)]" href="/auth">
          Login to review
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={sendReview}>
      <Textarea
        aria-label="Write your review"
        placeholder="Write your review..."
        value={review}
        onChange={(event) => setReview(event.target.value)}
      />
      <Button className="w-full" disabled={!review.trim()} type="submit" variant="secondary">
        Send review
      </Button>
    </form>
  );
}
