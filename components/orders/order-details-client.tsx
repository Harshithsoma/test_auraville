"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";
import {
  formatDiscount,
  getOrderSummaryValues,
  paymentStatusLabel,
  totalLabel
} from "@/components/orders/order-receipt-details";
import {
  deriveTrackingState,
  formatOrderDate,
  getOrderItemCount,
  getShippingPreview,
  orderStatusTone,
  type CustomerOrder,
  type CustomerOrderItem,
  type OrderDetailResponse
} from "@/components/orders/order-data";
import { OrderItemThumbnail } from "@/components/orders/order-item-thumbnail";
import { OrderTrackingProgress } from "@/components/orders/order-tracking-progress";

type DetailSectionKey = "items" | "summary" | "shipping";

type ActiveReviewEditor = {
  orderItemId: string;
  productId: string;
  productName: string;
  reviewId: string | null;
  selectedRating: number;
  subject: string;
  body: string;
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

const REVIEW_SUBJECT_MAX_LENGTH = 80;
const REVIEW_BODY_MAX_LENGTH = 300;

function DetailIcon({ kind }: { kind: DetailSectionKey }) {
  if (kind === "shipping") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "summary") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path
          d="M7 3.5h10v17H7zM9.5 8h5M9.5 11.5h5M9.5 15h3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 8.5h14l-1 11H6l-1-11Zm4 0V7a3 3 0 0 1 6 0v1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DetailCard({
  sectionKey,
  title,
  preview,
  isOpen,
  onToggle,
  children
}: {
  sectionKey: DetailSectionKey;
  title: string;
  preview: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = `order-detail-${sectionKey}`;

  return (
    <section className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--mint)]/28">
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="focus-ring flex w-full items-center gap-3 rounded-xl p-4 text-left md:hidden"
        type="button"
        onClick={onToggle}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--leaf-deep)]">
          <DetailIcon kind={sectionKey} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">{title}</span>
          {!isOpen ? <span className="mt-1 block min-w-0 text-xs text-[var(--muted)]">{preview}</span> : null}
        </span>
        <svg
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path d="m5 9 7 7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      <header className="hidden items-center gap-3 p-4 md:flex">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--leaf-deep)]">
          <DetailIcon kind={sectionKey} />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>

      <div
        id={contentId}
        className={`${isOpen ? "block" : "hidden"} border-t border-[var(--line)] p-4 md:block md:border-t-0 md:pt-1`}
      >
        {children}
      </div>
    </section>
  );
}

function OrderSummaryContent({ order }: { order: CustomerOrder }) {
  const values = getOrderSummaryValues(order.pricing);

  return (
    <dl className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-[var(--muted)]">Items subtotal</dt>
        <dd className="font-medium">{formatPrice(values.itemsSubtotal)}</dd>
      </div>
      {order.pricing.baseSavings > 0 ? (
        <div className="flex items-center justify-between gap-4 text-[var(--leaf-deep)]">
          <dt>Product savings</dt>
          <dd className="font-medium">{formatDiscount(order.pricing.baseSavings)}</dd>
        </div>
      ) : null}
      {values.couponDiscount > 0 ? (
        <div className="flex items-center justify-between gap-4 text-[var(--leaf-deep)]">
          <dt className="min-w-0 break-words">{values.couponLabel}</dt>
          <dd className="shrink-0 font-medium">{formatDiscount(values.couponDiscount)}</dd>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <dt className="text-[var(--muted)]">Delivery</dt>
        <dd className="font-medium">{order.pricing.shipping > 0 ? formatPrice(order.pricing.shipping) : "FREE"}</dd>
      </div>
      {order.pricing.gst > 0 ? (
        <div className="flex items-center justify-between gap-4">
          <dt className="text-[var(--muted)]">GST</dt>
          <dd className="font-medium">{formatPrice(order.pricing.gst)}</dd>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3 text-base font-semibold">
        <dt>{totalLabel(order.payment, order.status)}</dt>
        <dd>{formatPrice(order.pricing.total)}</dd>
      </div>
    </dl>
  );
}

export function OrderDetailsClient({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const requestedReviewItemId = searchParams.get("review");
  const hasOpenedRequestedReview = useRef(false);
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [openSections, setOpenSections] = useState<Record<DetailSectionKey, boolean>>({
    items: true,
    summary: false,
    shipping: false
  });
  const [activeEditor, setActiveEditor] = useState<ActiveReviewEditor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");

  const loadOrder = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await commerceApi.orders.byId<OrderDetailResponse>(orderId);
      setOrder(response.data);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to load this order right now.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  function openReviewEditor(item: CustomerOrderItem) {
    setActiveEditor({
      orderItemId: item.id,
      productId: item.productId,
      productName: item.name,
      reviewId: item.verifiedReview?.reviewId ?? null,
      selectedRating: item.verifiedReview?.rating ?? 0,
      subject: item.verifiedReview?.subject ?? "",
      body: item.verifiedReview?.body ?? ""
    });
    setOpenSections((current) => ({ ...current, items: true }));
    setReviewMessage("");
  }

  useEffect(() => {
    if (!order || !requestedReviewItemId || hasOpenedRequestedReview.current) return;
    const requestedItem = order.items.find((item) => item.id === requestedReviewItemId && item.canRate);
    if (!requestedItem) return;

    hasOpenedRequestedReview.current = true;
    setActiveEditor({
      orderItemId: requestedItem.id,
      productId: requestedItem.productId,
      productName: requestedItem.name,
      reviewId: requestedItem.verifiedReview?.reviewId ?? null,
      selectedRating: requestedItem.verifiedReview?.rating ?? 0,
      subject: requestedItem.verifiedReview?.subject ?? "",
      body: requestedItem.verifiedReview?.body ?? ""
    });
    setOpenSections((current) => ({ ...current, items: true }));
    setReviewMessage("");
  }, [order, requestedReviewItemId]);

  function patchReview(itemId: string, review: CustomerOrderItem["verifiedReview"]) {
    setOrder((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === itemId ? { ...item, verifiedReview: review } : item))
          }
        : current
    );
  }

  async function submitRating(item: CustomerOrderItem, rating: number) {
    setIsSavingRating(true);
    setReviewMessage("");
    try {
      const response = await commerceApi.reviews.verifiedRate<
        VerifiedRateResponse,
        { orderId: string; orderItemId: string; productId: string; rating: number }
      >({
        orderId: order?.id ?? orderId,
        orderItemId: item.id,
        productId: item.productId,
        rating
      });
      const nextReview = {
        reviewId: response.data.reviewId,
        rating,
        subject: activeEditor?.subject || null,
        body: activeEditor?.body ?? ""
      };
      patchReview(item.id, nextReview);
      setActiveEditor((current) =>
        current ? { ...current, reviewId: response.data.reviewId, selectedRating: rating } : current
      );
      setReviewMessage(response.data.message);
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Unable to save rating right now.");
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
        body: activeEditor.body.trim() || undefined
      });

      const currentItem = order?.items.find((item) => item.id === activeEditor.orderItemId);
      patchReview(activeEditor.orderItemId, {
        reviewId: activeEditor.reviewId,
        rating: activeEditor.selectedRating,
        subject: activeEditor.subject.trim() || null,
        body: activeEditor.body.trim() || currentItem?.verifiedReview?.body || ""
      });
      setReviewMessage(response.data.message);
      setActiveEditor(null);
    } catch (error) {
      setReviewMessage(error instanceof ApiError ? error.message : "Unable to save review text right now.");
    } finally {
      setIsSavingText(false);
    }
  }

  if (!hasMounted || isHydrating || !hasHydrated || (isLoading && !order)) {
    return (
      <div className="container-page py-10">
        <div className="rounded-xl border border-[var(--line)] bg-white p-8">Loading order details...</div>
      </div>
    );
  }

  if (!user) {
    const nextPath = encodeURIComponent(`/orders/${orderId}`);
    return (
      <div className="container-page py-10">
        <section className="rounded-xl border border-[var(--line)] bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold">Login to view this order.</h1>
          <p className="mt-3 text-[var(--muted)]">Order details are available only to the account that placed the order.</p>
          <Button className="mt-6" href={`/auth?next=${nextPath}`}>Login</Button>
        </section>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-page py-10">
        <section className="rounded-xl border border-[var(--line)] bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold">Order details unavailable.</h1>
          <p className="mt-3 text-[var(--muted)]">{errorMessage ?? "This order could not be found."}</p>
          <Button className="mt-6" href="/orders" variant="secondary">Back to My Orders</Button>
        </section>
      </div>
    );
  }

  const tracking = deriveTrackingState(order);
  const itemCount = getOrderItemCount(order);
  const previewItems = order.items.filter((item) => Boolean(item.image)).slice(0, 3);

  return (
    <div className="container-page py-6 sm:py-10 md:py-14">
      <Link className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[var(--leaf-deep)]" href="/orders">
        <span aria-hidden="true">←</span>
        Back to My Orders
      </Link>

      <article className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_18px_55px_rgb(23_33_28_/_6%)] sm:p-6">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--coral)]">Order details</p>
            <h1 className="mt-2 break-words text-2xl font-semibold leading-tight sm:text-3xl">Order {order.id}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{formatOrderDate(order.createdAt)}</p>
          </div>
          <span className={`w-fit rounded-lg border px-3 py-1.5 text-sm font-semibold ${orderStatusTone(order)}`}>
            {tracking.headline}
          </span>
        </header>

        <section aria-label="Payment summary" className="grid gap-3 border-b border-[var(--line)] py-5 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Payment method</p>
            <p className="mt-1 font-semibold">Online payment</p>
          </div>
          {order.payment?.provider ? (
            <div className="sm:border-l sm:border-[var(--line)] sm:pl-4">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Payment provider</p>
              <p className="mt-1 font-semibold">{order.payment.provider}</p>
            </div>
          ) : null}
          <div className="sm:border-l sm:border-[var(--line)] sm:pl-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Payment status</p>
            <p className={`mt-1 font-semibold ${tracking.isFailed ? "text-[var(--coral)]" : ""}`}>
              {paymentStatusLabel(order.payment, order.status)}
            </p>
          </div>
        </section>

        <div className="py-5">
          <OrderTrackingProgress order={order} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.9fr_1fr]">
          <DetailCard
            isOpen={openSections.items}
            onToggle={() => setOpenSections((current) => ({ ...current, items: !current.items }))}
            preview={
              <span className="flex items-center gap-2">
                {previewItems.length > 0 ? (
                  <span className="flex -space-x-2">
                    {previewItems.map((item) => <OrderItemThumbnail item={item} key={item.id} sizeClass="h-7 w-7" />)}
                  </span>
                ) : null}
                <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
              </span>
            }
            sectionKey="items"
            title="Ordered Items"
          >
            <ul className="space-y-4">
              {order.items.map((item) => {
                const isEditing = activeEditor?.orderItemId === item.id;
                return (
                  <li className="border-b border-[var(--line)] pb-4 last:border-b-0 last:pb-0" key={item.id}>
                    <div className="flex items-start gap-3">
                      <OrderItemThumbnail item={item} sizeClass="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <Link className="focus-ring rounded font-semibold leading-5 hover:text-[var(--leaf-deep)]" href={`/product/${item.slug}`}>
                          {item.quantity} x {item.name}
                        </Link>
                        <p className="mt-1 break-words text-xs text-[var(--muted)]">{item.variantLabel}</p>
                        {item.canRate ? (
                          <button
                            className="focus-ring mt-2 rounded text-xs font-semibold text-[var(--leaf-deep)] underline"
                            type="button"
                            onClick={() => openReviewEditor(item)}
                          >
                            {item.verifiedReview ? `Rated ${item.verifiedReview.rating}/5 · Edit review` : "Rate product"}
                          </button>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{formatPrice(item.unitPrice * item.quantity)}</span>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 rounded-lg border border-[var(--line)] bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Rating</p>
                        <div className="mt-2 flex items-center gap-2">
                          {Array.from({ length: 5 }).map((_, index) => {
                            const rating = index + 1;
                            return (
                              <button
                                aria-label={`Rate ${rating} stars`}
                                className={`focus-ring text-2xl leading-none ${
                                  rating <= activeEditor.selectedRating ? "text-[var(--gold)]" : "text-[var(--line)]"
                                }`}
                                disabled={isSavingRating}
                                key={rating}
                                type="button"
                                onClick={() => void submitRating(item, rating)}
                              >
                                ★
                              </button>
                            );
                          })}
                        </div>
                        <label className="mt-3 block">
                          <span className="text-xs font-semibold">Subject</span>
                          <Input
                            className="mt-1"
                            maxLength={REVIEW_SUBJECT_MAX_LENGTH}
                            value={activeEditor.subject}
                            onChange={(event) =>
                              setActiveEditor((current) => current ? { ...current, subject: event.target.value } : current)
                            }
                          />
                        </label>
                        <label className="mt-3 block">
                          <span className="text-xs font-semibold">Optional review</span>
                          <Textarea
                            className="mt-1 min-h-20"
                            maxLength={REVIEW_BODY_MAX_LENGTH}
                            value={activeEditor.body}
                            onChange={(event) =>
                              setActiveEditor((current) => current ? { ...current, body: event.target.value } : current)
                            }
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            disabled={isSavingText || !activeEditor.reviewId}
                            type="button"
                            onClick={() => void submitReviewText()}
                          >
                            {isSavingText ? "Saving..." : "Save review"}
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setActiveEditor(null)}>Close</Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </DetailCard>

          <DetailCard
            isOpen={openSections.summary}
            onToggle={() => setOpenSections((current) => ({ ...current, summary: !current.summary }))}
            preview={<span>Total: <strong className="text-[var(--foreground)]">{formatPrice(order.pricing.total)}</strong></span>}
            sectionKey="summary"
            title="Order Summary"
          >
            <OrderSummaryContent order={order} />
          </DetailCard>

          <DetailCard
            isOpen={openSections.shipping}
            onToggle={() => setOpenSections((current) => ({ ...current, shipping: !current.shipping }))}
            preview={
              <span className="block">
                <strong className="block truncate text-[var(--foreground)]">{order.shippingAddress.name}</strong>
                <span className="mt-0.5 block truncate">{getShippingPreview(order.shippingAddress)}</span>
              </span>
            }
            sectionKey="shipping"
            title="Ship To"
          >
            <address className="not-italic text-sm leading-6 text-[var(--muted)] break-words">
              <p className="font-semibold text-[var(--foreground)]">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 ? <p>{order.shippingAddress.addressLine2}</p> : null}
              <p>
                {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} - {order.shippingAddress.pincode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-1">Phone: {order.shippingAddress.phone}</p>
            </address>
          </DetailCard>
        </div>

        {reviewMessage ? (
          <p className="mt-4 text-sm font-semibold text-[var(--leaf-deep)]" role="status" aria-live="polite">{reviewMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 text-sm font-semibold text-[var(--coral)]" role="status">{errorMessage}</p>
        ) : null}
      </article>
    </div>
  );
}
