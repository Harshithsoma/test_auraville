"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { useSectionInView } from "@/hooks/use-section-in-view";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";

type Review = {
  id: string;
  name: string;
  subject: string;
  text: string;
  rating: number;
};

type ReviewsListResponse = {
  data: Array<{
    id: string;
    rating: number;
    subject: string;
    body: string;
    productId: string | null;
    createdAt: string;
    user: {
      name: string | null;
      email: string;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CreateReviewResponse = {
  data: {
    id: string;
    message: string;
  };
};

const baseReviews: Review[] = [
  {
    id: "anika",
    name: "Anika R.",
    subject: "Balanced sweetness",
    rating: 5,
    text: "The energy bar feels clean and filling without being too sweet. Easy daily snack."
  },
  {
    id: "dev",
    name: "Dev M.",
    subject: "Honest launch",
    rating: 4,
    text: "Good ingredient profile and honest launch approach. Looking forward to the cookies."
  },
  {
    id: "meera",
    name: "Meera S.",
    subject: "Great ingredient story",
    rating: 5,
    text: "Palmyra sprout in a modern format is exactly what I wanted for office snacking."
  },
  {
    id: "pranav",
    name: "Pranav K.",
    subject: "Works on busy days",
    rating: 4,
    text: "Texture is solid and travel-friendly. Works well for pre-workout days."
  },
  {
    id: "ishita",
    name: "Ishita N.",
    subject: "Clean label",
    rating: 5,
    text: "Loved the taste and clean label. The brand story also feels meaningful."
  },
  {
    id: "harish",
    name: "Harish V.",
    subject: "Reliable quality",
    rating: 4,
    text: "Simple product, good quality, and straightforward checkout experience."
  }
];

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getVisibleCards() {
  return window.innerWidth >= 1024 ? 3 : 1;
}

function mapBackendReviews(response: ReviewsListResponse): Review[] {
  return response.data.map((item) => ({
    id: item.id,
    name: item.user.name?.trim() || "Verified Customer",
    subject: item.subject,
    text: item.body,
    rating: item.rating
  }));
}

export function ReviewsSlider() {
  const user = useAuthStore((state) => state.user);
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 1);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [formMessage, setFormMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const cloneCount = Math.min(visibleCards, reviews.length);
  const loopReviews = useMemo(() => {
    if (reviews.length === 0) return [];
    if (reviews.length <= visibleCards) return reviews;
    const head = reviews.slice(0, cloneCount);
    const tail = reviews.slice(-cloneCount);
    return [...tail, ...reviews, ...head];
  }, [cloneCount, reviews, visibleCards]);

  const [offset, setOffset] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);

  const viewportRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const offsetRef = useRef(offset);
  const isSectionInView = useSectionInView(carouselRef);

  const canSlide = reviews.length > visibleCards;
  const trackIndex = canSlide ? offset + cloneCount : 0;

  useEffect(() => {
    let isCancelled = false;

    async function loadApprovedReviews() {
      setIsLoadingReviews(true);
      setReviewsError(null);

      try {
        const response = await commerceApi.reviews.list<ReviewsListResponse>({ page: 1, limit: 30 });
        if (!isCancelled) {
          setReviews(mapBackendReviews(response));
        }
      } catch (error) {
        if (!isCancelled) {
          setReviews(baseReviews);
          if (error instanceof ApiError) {
            setReviewsError(error.message);
          } else {
            setReviewsError("Unable to load live reviews right now. Showing featured testimonials.");
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingReviews(false);
        }
      }
    }

    void loadApprovedReviews();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    if (!canSlide || isDragging || !isTransitionEnabled) return;
    const timer = window.setInterval(() => {
      setOffset((current) => current + 1);
    }, 4300);
    return () => window.clearInterval(timer);
  }, [canSlide, isDragging, isTransitionEnabled]);

  useEffect(() => {
    if (!isComposerOpen) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsComposerOpen(false);
      }
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isComposerOpen]);

  function silentJump(nextOffset: number) {
    setIsTransitionEnabled(false);
    setOffset(nextOffset);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsTransitionEnabled(true);
      });
    });
  }

  function beginDrag(pointerId: number, clientX: number, target: HTMLDivElement) {
    if (!canSlide) return;
    pointerIdRef.current = pointerId;
    startXRef.current = clientX;
    target.setPointerCapture(pointerId);
    setIsDragging(true);
    setDragOffset(0);
  }

  function moveDrag(pointerId: number, clientX: number) {
    if (!isDragging || pointerIdRef.current !== pointerId) return;
    setDragOffset(clientX - startXRef.current);
  }

  function endDrag(pointerId?: number, clientX?: number) {
    if (!isDragging) return;
    if (typeof pointerId === "number" && pointerIdRef.current !== pointerId) return;

    const finalOffset = typeof clientX === "number" ? clientX - startXRef.current : dragOffset;
    const width = viewportRef.current?.clientWidth ?? 0;
    const threshold = Math.max(40, Math.round(width * 0.11));

    if (finalOffset > threshold) {
      setOffset((current) => current - 1);
    } else if (finalOffset < -threshold) {
      setOffset((current) => current + 1);
    }

    setDragOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setFormMessage("Please login to submit a review.");
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setFormMessage("Please complete both subject and review text.");
      return;
    }

    setIsSubmittingReview(true);
    setFormMessage("");

    try {
      const response = await commerceApi.reviews.create<
        CreateReviewResponse,
        {
          rating: number;
          subject: string;
          body: string;
          productId?: string;
        }
      >({
        rating,
        subject: subject.trim(),
        body: body.trim()
      });

      setSubject("");
      setBody("");
      setRating(5);
      setFormMessage(response.data.message || "Review submitted for approval.");
      setIsComposerOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormMessage(error.message);
      } else {
        setFormMessage("Unable to submit review right now.");
      }
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="reviews-title" className="text-2xl font-bold sm:text-3xl">
          Reviews
        </h2>
        <Button type="button" variant="secondary" onClick={() => setIsComposerOpen(true)}>
          Write a Review
        </Button>
      </div>

      {isLoadingReviews ? (
        <div className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]">
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]">
          No approved reviews yet.
        </div>
      ) : (
        <div className="relative mt-6" ref={carouselRef}>
          <div
            className="overflow-hidden"
            ref={viewportRef}
            style={{ touchAction: "pan-y" }}
            onPointerCancel={() => endDrag()}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              beginDrag(event.pointerId, event.clientX, event.currentTarget);
            }}
            onPointerMove={(event) => moveDrag(event.pointerId, event.clientX)}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              endDrag(event.pointerId, event.clientX);
            }}
          >
            <div
              className={`-mx-2 flex ${isDragging || !isTransitionEnabled ? "" : "transition-transform duration-500 ease-out"} lg:-mx-2.5`}
              style={{
                transform: `translate3d(calc(-${(trackIndex * 100) / visibleCards}% + ${dragOffset}px), 0, 0)`
              }}
              onTransitionEnd={(event) => {
                if (!canSlide) return;
                if (event.target !== event.currentTarget || event.propertyName !== "transform") return;

                const current = offsetRef.current;
                if (current >= reviews.length) {
                  silentJump(0);
                } else if (current < 0) {
                  silentJump(reviews.length - 1);
                }
              }}
            >
              {loopReviews.map((review, loopIndex) => (
                <article
                  className="shrink-0 basis-full px-2 lg:basis-1/3 lg:px-2.5"
                  key={`${review.id}-${loopIndex}`}
                >
                  <div className="h-full rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{review.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {review.subject}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--leaf-deep)]">{"★".repeat(review.rating)}</p>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{review.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {canSlide && isSectionInView ? (
            <>
              <button
                aria-label="Show previous reviews"
                className="focus-ring absolute -left-5 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-lg text-[var(--leaf-deep)] shadow-sm transition active:scale-95 md:inline-flex"
                type="button"
                onClick={() => setOffset((current) => current - 1)}
              >
                ‹
              </button>
              <button
                aria-label="Show next reviews"
                className="focus-ring absolute -right-5 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-lg text-[var(--leaf-deep)] shadow-sm transition active:scale-95 md:inline-flex"
                type="button"
                onClick={() => setOffset((current) => current + 1)}
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      )}

      {reviewsError ? (
        <p className="mt-4 text-sm font-semibold text-[var(--muted)]" role="status" aria-live="polite">
          {reviewsError}
        </p>
      ) : null}

      {isComposerOpen ? (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <button
            aria-label="Close review composer"
            className="absolute inset-0"
            type="button"
            onClick={() => setIsComposerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-[var(--line)] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Write a Review</h3>
              <button
                aria-label="Close review composer"
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-lg transition active:scale-95"
                type="button"
                onClick={() => setIsComposerOpen(false)}
              >
                ×
              </button>
            </div>

            {user ? (
              <form className="mt-5 space-y-4" onSubmit={(event) => void submitReview(event)}>
                <label className="block">
                  <span className="text-sm font-semibold">Subject</span>
                  <Input className="mt-2" value={subject} onChange={(event) => setSubject(event.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">Review</span>
                  <Textarea className="mt-2 min-h-28" value={body} onChange={(event) => setBody(event.target.value)} />
                </label>

                <div>
                  <p className="text-sm font-semibold">Rating</p>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const nextRating = idx + 1;
                      return (
                        <button
                          aria-label={`Rate ${nextRating} stars`}
                          className={`focus-ring text-2xl leading-none transition ${
                            nextRating <= rating ? "text-[var(--gold)]" : "text-[var(--line)]"
                          }`}
                          key={nextRating}
                          type="button"
                          onClick={() => setRating(nextRating)}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button className="w-full" type="submit" disabled={isSubmittingReview}>
                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            ) : (
              <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
                <p className="text-sm text-[var(--muted)]">Login is required to submit a review.</p>
                <Button className="mt-4" href="/auth?next=/" variant="secondary">
                  Login to review
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {formMessage ? (
        <p className="mt-4 text-sm font-semibold text-[var(--leaf-deep)]" role="status" aria-live="polite">
          {formMessage}
        </p>
      ) : null}
    </section>
  );
}
