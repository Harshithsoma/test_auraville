"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";

type VerifiedReview = {
  reviewId: string;
  rating: number;
  subject: string | null;
  body: string;
};

type BackendOrderItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  canRate: boolean;
  verifiedReview: VerifiedReview | null;
};

type BackendOrder = {
  id: string;
  email: string;
  items: BackendOrderItem[];
  total: number;
  status: string;
  createdAt: string;
};

type OrdersListResponse = {
  data: BackendOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

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

type VerifiedRateResponse = {
  data: {
    reviewId: string;
    message: string;
  };
};

type VerifiedTextResponse = {
  data: {
    reviewId: string;
    message: string;
  };
};

type ActiveReviewEditor = {
  orderId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  reviewId: string | null;
  selectedRating: number;
  subject: string;
  body: string;
};

function orderItemKey(orderId: string, orderItemId: string): string {
  return `${orderId}:${orderItemId}`;
}

const REVIEW_SUBJECT_MAX_LENGTH = 80;
const REVIEW_BODY_MAX_LENGTH = 450;

export function OrdersClient() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string>("");
  const [activeEditor, setActiveEditor] = useState<ActiveReviewEditor | null>(
    null,
  );
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const [pendingPrompt, setPendingPrompt] =
    useState<VerifiedPromptResponse["data"]>(null);

  const deliveredItemCount = useMemo(
    () =>
      orders.reduce((count, order) => {
        if (order.status !== "delivered") {
          return count;
        }
        return count + order.items.length;
      }, 0),
    [orders],
  );

  const loadOrders = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await commerceApi.orders.list<OrdersListResponse>({
        page: 1,
        limit: 20,
      });
      setOrders(response.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load orders right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadPrompt = useCallback(async () => {
    if (!user) {
      setPendingPrompt(null);
      return;
    }

    try {
      const response =
        await commerceApi.reviews.verifiedPrompt<VerifiedPromptResponse>();
      setPendingPrompt(response.data);
    } catch {
      setPendingPrompt(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setPendingPrompt(null);
      return;
    }

    void loadOrders();
    void loadPrompt();
  }, [loadOrders, loadPrompt, user]);

  function patchOrderItemReview(params: {
    orderId: string;
    orderItemId: string;
    reviewId: string;
    rating: number;
    subject?: string;
    body?: string;
  }) {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== params.orderId) {
          return order;
        }
        return {
          ...order,
          items: order.items.map((item) => {
            if (item.id !== params.orderItemId) {
              return item;
            }

            return {
              ...item,
              verifiedReview: {
                reviewId: params.reviewId,
                rating: params.rating,
                subject: params.subject ?? item.verifiedReview?.subject ?? null,
                body: params.body ?? item.verifiedReview?.body ?? "",
              },
            };
          }),
        };
      }),
    );
  }

  async function submitRating(params: {
    orderId: string;
    orderItemId: string;
    productId: string;
    rating: number;
  }) {
    if (params.rating < 1 || params.rating > 5) {
      setReviewMessage("Please select a rating before submitting.");
      return null;
    }

    setIsSavingRating(true);
    setReviewMessage("");

    try {
      const response = await commerceApi.reviews.verifiedRate<
        VerifiedRateResponse,
        {
          orderId: string;
          orderItemId: string;
          productId: string;
          rating: number;
        }
      >({
        orderId: params.orderId,
        orderItemId: params.orderItemId,
        productId: params.productId,
        rating: params.rating,
      });

      patchOrderItemReview({
        orderId: params.orderId,
        orderItemId: params.orderItemId,
        reviewId: response.data.reviewId,
        rating: params.rating,
      });

      setReviewMessage(response.data.message);
      void loadPrompt();
      return response.data.reviewId;
    } catch (error) {
      if (error instanceof ApiError) {
        setReviewMessage(error.message);
      } else {
        setReviewMessage("Unable to save rating right now.");
      }
      return null;
    } finally {
      setIsSavingRating(false);
    }
  }

  async function submitReviewText() {
    if (!activeEditor?.reviewId) {
      setReviewMessage("Save a star rating first.");
      return;
    }

    if (!activeEditor.subject.trim() && !activeEditor.body.trim()) {
      setReviewMessage("Write optional subject or review text before saving.");
      return;
    }

    setIsSavingText(true);
    setReviewMessage("");
    try {
      const response = await commerceApi.reviews.verifiedText<
        VerifiedTextResponse,
        { reviewId: string; subject?: string; body?: string }
      >({
        reviewId: activeEditor.reviewId,
        subject: activeEditor.subject.trim() || undefined,
        body: activeEditor.body.trim() || undefined,
      });

      patchOrderItemReview({
        orderId: activeEditor.orderId,
        orderItemId: activeEditor.orderItemId,
        reviewId: activeEditor.reviewId,
        rating: activeEditor.selectedRating,
        subject: activeEditor.subject.trim() || undefined,
        body: activeEditor.body.trim() || undefined,
      });
      setReviewMessage(response.data.message);
      setActiveEditor(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setReviewMessage(error.message);
      } else {
        setReviewMessage("Unable to save review text right now.");
      }
    } finally {
      setIsSavingText(false);
    }
  }

  if (!hasMounted || isHydrating || !hasHydrated) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-white p-8">
        Loading orders...
      </div>
    );
  }

  if (!user && hasHydrated) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold">Login to view orders.</h1>
        <p className="mt-3 text-[var(--muted)]">
          Past and pending orders are linked to your account email.
        </p>
        <Button className="mt-6" href="/auth?next=/orders">
          Login
        </Button>
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-white p-8">
        Loading your orders...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">
          We could not load your orders.
        </h1>
        <p className="mt-3 text-[var(--muted)]">{errorMessage}</p>
        <Button
          className="mt-6"
          type="button"
          onClick={() => {
            void loadOrders();
          }}
        >
          Retry
        </Button>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold">No orders yet.</h1>
        <p className="mt-3 text-[var(--muted)]">
          Your palmyra sprout orders will appear here after checkout.
        </p>
        <Button className="mt-6" href="/product/palmyra-sprout-energy-bar">
          Shop best selling
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Your orders">
      {pendingPrompt ? (
        <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)]/45 p-4">
          <p className="text-sm font-semibold">
            How was your {pendingPrompt.productName}?
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Select your star rating first. Written feedback is optional.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, idx) => {
              const nextRating = idx + 1;
              return (
                <button
                  aria-label={`Rate ${nextRating} stars`}
                  className="focus-ring text-2xl leading-none text-[var(--gold)] transition hover:scale-105"
                  disabled={isSavingRating}
                  key={nextRating}
                  type="button"
                  onClick={() => {
                    void submitRating({
                      orderId: pendingPrompt.orderId,
                      orderItemId: pendingPrompt.orderItemId,
                      productId: pendingPrompt.productId,
                      rating: nextRating,
                    }).then((reviewId) => {
                      if (!reviewId) {
                        return;
                      }
                      setActiveEditor({
                        orderId: pendingPrompt.orderId,
                        orderItemId: pendingPrompt.orderItemId,
                        productId: pendingPrompt.productId,
                        productName: pendingPrompt.productName,
                        reviewId,
                        selectedRating: nextRating,
                        subject: "",
                        body: "",
                      });
                    });
                  }}
                >
                  ★
                </button>
              );
            })}
          </div>
        </article>
      ) : null}

      {orders.map((order) => (
        <article
          className="rounded-lg border border-[var(--line)] bg-white p-5"
          key={order.id}
        >
          <div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Order {order.id}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(order.createdAt))}
              </p>
            </div>
            <span className="w-fit rounded-full bg-[var(--mint)] px-3 py-1 text-sm font-bold capitalize text-[var(--leaf-deep)]">
              {order.status}
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {order.items.map((item) => {
              const itemKey = orderItemKey(order.id, item.id);
              const isEditing =
                activeEditor &&
                orderItemKey(activeEditor.orderId, activeEditor.orderItemId) ===
                  itemKey;
              return (
                <li
                  className="rounded-lg border border-transparent p-2 -mx-2"
                  key={`${order.id}-${item.id}`}
                >
                  <div className="flex justify-between gap-4 text-sm">
                    <div>
                      <Link
                        className="focus-ring rounded-lg font-semibold"
                        href={`/product/${item.slug}`}
                      >
                        {item.quantity} x {item.name} ({item.variantLabel})
                      </Link>
                      {item.canRate ? (
                        <div className="mt-2 flex items-center gap-2">
                          {item.verifiedReview ? (
                            <span className="rounded bg-[var(--mint)] px-2 py-1 text-xs font-semibold text-[var(--leaf-deep)]">
                              Rated {item.verifiedReview.rating}/5
                            </span>
                          ) : null}
                          <button
                            className="focus-ring text-xs font-semibold text-[var(--leaf-deep)] underline"
                            type="button"
                            onClick={() =>
                              setActiveEditor({
                                orderId: order.id,
                                orderItemId: item.id,
                                productId: item.productId,
                                productName: item.name,
                                reviewId: item.verifiedReview?.reviewId ?? null,
                                selectedRating:
                                  item.verifiedReview?.rating ?? 0,
                                subject: item.verifiedReview?.subject ?? "",
                                body: item.verifiedReview?.body ?? "",
                              })
                            }
                          >
                            {item.verifiedReview
                              ? "Edit review"
                              : "Rate product"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Rating
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const nextRating = idx + 1;
                          return (
                            <button
                              aria-label={`Rate ${nextRating} stars`}
                              className={`focus-ring text-3xl leading-none transition ${
                                nextRating <= activeEditor.selectedRating
                                  ? "text-[var(--gold)]"
                                  : "text-[var(--line)]"
                              }`}
                              disabled={isSavingRating}
                              key={nextRating}
                              type="button"
                              onClick={() => {
                                setActiveEditor((current) =>
                                  current
                                    ? { ...current, selectedRating: nextRating }
                                    : current,
                                );
                                void submitRating({
                                  orderId: order.id,
                                  orderItemId: item.id,
                                  productId: item.productId,
                                  rating: nextRating,
                                }).then((reviewId) => {
                                  if (!reviewId) return;
                                  setActiveEditor((current) =>
                                    current
                                      ? { ...current, reviewId }
                                      : current,
                                  );
                                });
                              }}
                            >
                              ★
                            </button>
                          );
                        })}
                      </div>

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Optional written review
                      </p>
                      <label className="mt-2 block">
                        <span className="text-xs font-semibold">Subject</span>
                        <Input
                          className="mt-1"
                          maxLength={REVIEW_SUBJECT_MAX_LENGTH}
                          value={activeEditor.subject}
                          onChange={(event) =>
                            setActiveEditor((current) =>
                              current
                                ? { ...current, subject: event.target.value }
                                : current,
                            )
                          }
                        />
                        <p className="mt-1 text-right text-[11px] text-[var(--muted)]">
                          {activeEditor.subject.length}/
                          {REVIEW_SUBJECT_MAX_LENGTH}
                        </p>
                      </label>
                      <label className="mt-2 block">
                        <span className="text-xs font-semibold">Review</span>
                        <Textarea
                          className="mt-1 min-h-24"
                          maxLength={REVIEW_BODY_MAX_LENGTH}
                          value={activeEditor.body}
                          onChange={(event) =>
                            setActiveEditor((current) =>
                              current
                                ? { ...current, body: event.target.value }
                                : current,
                            )
                          }
                        />
                        <p className="mt-1 text-right text-[11px] text-[var(--muted)]">
                          {activeEditor.body.length}/{REVIEW_BODY_MAX_LENGTH}
                        </p>
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={isSavingText || !activeEditor.reviewId}
                          onClick={() => {
                            void submitReviewText();
                          }}
                        >
                          {isSavingText ? "Saving..." : "Save review text"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setActiveEditor(null)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 border-t border-[var(--line)] pt-4 text-right font-semibold">
            Total {formatPrice(order.total)}
          </p>
        </article>
      ))}

      {deliveredItemCount > 0 && reviewMessage ? (
        <p
          className="text-sm font-semibold text-[var(--leaf-deep)]"
          role="status"
          aria-live="polite"
        >
          {reviewMessage}
        </p>
      ) : null}
    </section>
  );
}
