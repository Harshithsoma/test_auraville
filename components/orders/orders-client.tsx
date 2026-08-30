"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/price";
import {
  deriveTrackingState,
  formatOrderDate,
  getOrderItemCount,
  getShippingPreview,
  orderStatusTone,
  type CustomerOrder,
  type OrdersListResponse
} from "@/components/orders/order-data";
import { OrderItemThumbnail } from "@/components/orders/order-item-thumbnail";

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

const ORDERS_PAGE_SIZE = 10;

function getVisibleOrderPages(currentPage: number, totalPages: number): number[] {
  const pages = new Set<number>();
  if (totalPages <= 0) return [];

  pages.add(1);
  pages.add(totalPages);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function SummaryIcon({ kind }: { kind: "items" | "total" | "shipping" }) {
  if (kind === "shipping") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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

  if (kind === "total") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M7 4h10v16H7zM9.5 8h5M9.5 11h5M9.5 14h3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 8.5h12l-1 10H7l-1-10Zm3 0V7a3 3 0 0 1 6 0v1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function OrderListCard({ order }: { order: CustomerOrder }) {
  const tracking = deriveTrackingState(order);
  const itemCount = getOrderItemCount(order);
  const previewItems = order.items.filter((item) => Boolean(item.image)).slice(0, 3);
  const detailHref = `/orders/${encodeURIComponent(order.id)}`;

  return (
    <article>
      <Link
        aria-label={`View details for order ${order.id}`}
        className="focus-ring group grid grid-cols-[0.8fr_0.65fr_1.35fr] overflow-hidden rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_10px_35px_rgb(23_33_28_/_4%)] transition hover:border-[var(--leaf)] hover:shadow-[0_14px_40px_rgb(23_33_28_/_8%)] sm:p-5 lg:grid-cols-[1.35fr_1fr_0.65fr_1.45fr_auto] lg:items-center lg:p-0"
        href={detailHref}
      >
        <div className="col-span-3 flex min-w-0 items-start justify-between gap-3 border-b border-[var(--line)] pb-4 lg:col-span-1 lg:block lg:border-b-0 lg:p-5">
          <div className="min-w-0">
            <h2 className="break-words text-base font-semibold leading-5 sm:text-lg">Order {order.id}</h2>
            <p className="mt-1.5 text-xs text-[var(--muted)] sm:text-sm">{formatOrderDate(order.createdAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:mt-3">
            <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${orderStatusTone(order)}`}>
              {tracking.headline}
            </span>
            <svg
              aria-hidden="true"
              className="h-5 w-5 text-[var(--leaf-deep)] transition group-hover:translate-x-0.5 lg:hidden"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
        </div>

        <div className="min-w-0 border-r border-[var(--line)] pt-4 pr-3 lg:border-l lg:py-5 lg:pl-5">
          <div className="flex items-center gap-2 text-[var(--leaf-deep)]">
            <SummaryIcon kind="items" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] lg:normal-case lg:tracking-normal">Items</p>
          </div>
          <div className="mt-2 flex min-w-0 flex-col items-start gap-1 lg:flex-row lg:items-center lg:gap-1.5">
            {previewItems.length > 0 ? (
              <div className="flex shrink-0 -space-x-2">
                {previewItems.map((item) => (
                  <OrderItemThumbnail item={item} key={item.id} sizeClass="h-7 w-7" />
                ))}
              </div>
            ) : null}
            <span className="min-w-0 text-[11px] leading-4 text-[var(--ink-soft)] sm:text-xs lg:text-sm">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        <div className="min-w-0 border-r border-[var(--line)] px-3 pt-4 lg:py-5 lg:pl-5">
          <div className="flex items-center gap-2 text-[var(--leaf-deep)]">
            <SummaryIcon kind="total" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] lg:normal-case lg:tracking-normal">Total</p>
          </div>
          <p className="mt-2 break-words text-sm font-semibold sm:text-base">{formatPrice(order.pricing.total)}</p>
        </div>

        <div className="min-w-0 pt-4 pl-3 lg:border-r lg:border-[var(--line)] lg:py-5 lg:pl-5">
          <div className="flex items-center gap-2 text-[var(--leaf-deep)]">
            <SummaryIcon kind="shipping" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] lg:normal-case lg:tracking-normal">Ship to</p>
          </div>
          <p className="mt-2 truncate text-xs font-semibold sm:text-sm lg:whitespace-normal">{order.shippingAddress.name}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--muted)] sm:text-xs">
            {getShippingPreview(order.shippingAddress)}
          </p>
        </div>

        <div className="hidden px-5 lg:flex lg:items-center lg:gap-3">
          <span className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--leaf-deep)] transition group-hover:border-[var(--leaf)]">
            View details
          </span>
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-[var(--leaf-deep)] transition group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
      </Link>
    </article>
  );
}

export function OrdersClient() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<OrdersListResponse["pagination"]>({
    page: 1,
    limit: ORDERS_PAGE_SIZE,
    total: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<VerifiedPromptResponse["data"]>(null);

  const loadOrders = useCallback(
    async (targetPage: number) => {
      if (!user) return;

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await commerceApi.orders.list<OrdersListResponse>({
          page: targetPage,
          limit: ORDERS_PAGE_SIZE
        });
        setOrders(response.data);
        setPagination(response.pagination);
      } catch (error) {
        setErrorMessage(error instanceof ApiError ? error.message : "Unable to load orders right now.");
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const loadPrompt = useCallback(async () => {
    if (!user) {
      setPendingPrompt(null);
      return;
    }

    try {
      const response = await commerceApi.reviews.verifiedPrompt<VerifiedPromptResponse>();
      setPendingPrompt(response.data);
    } catch {
      setPendingPrompt(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setPendingPrompt(null);
      setPagination({ page: 1, limit: ORDERS_PAGE_SIZE, total: 0, totalPages: 0 });
      setPage(1);
      return;
    }

    void loadOrders(page);
  }, [loadOrders, page, user]);

  useEffect(() => {
    void loadPrompt();
  }, [loadPrompt]);

  if (!hasMounted || isHydrating || !hasHydrated) {
    return <div className="rounded-xl border border-[var(--line)] bg-white p-8">Loading orders...</div>;
  }

  if (!user) {
    return (
      <section className="rounded-xl border border-[var(--line)] bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold">Login to view orders.</h2>
        <p className="mt-3 text-[var(--muted)]">Past and pending orders are linked to your account.</p>
        <Button className="mt-6" href="/auth?next=/orders">Login</Button>
      </section>
    );
  }

  if (isLoading && orders.length === 0) {
    return <div className="rounded-xl border border-[var(--line)] bg-white p-8">Loading your orders...</div>;
  }

  if (errorMessage && orders.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--line)] bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold">We could not load your orders.</h2>
        <p className="mt-3 text-[var(--muted)]">{errorMessage}</p>
        <Button className="mt-6" type="button" onClick={() => void loadOrders(page)}>Retry</Button>
      </section>
    );
  }

  if (pagination.total === 0) {
    return (
      <section className="rounded-xl border border-[var(--line)] bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold">No orders yet.</h2>
        <p className="mt-3 text-[var(--muted)]">Your palmyra sprout orders will appear here after checkout.</p>
        <Button className="mt-6" href="/product/palmyra-sprout-energy-bar">Shop best selling</Button>
      </section>
    );
  }

  const visiblePages = getVisibleOrderPages(page, pagination.totalPages);

  return (
    <section aria-label="Your orders">
      {pendingPrompt ? (
        <Link
          className="focus-ring mb-4 flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--mint)]/55 p-4 transition hover:border-[var(--leaf)]"
          href={`/orders/${encodeURIComponent(pendingPrompt.orderId)}?review=${encodeURIComponent(pendingPrompt.orderItemId)}`}
        >
          <div>
            <p className="text-sm font-semibold">How was your {pendingPrompt.productName}?</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Rate your verified purchase from its order details.</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--leaf-deep)]">Rate product</span>
        </Link>
      ) : null}

      <div className="space-y-4">
        {orders.map((order) => <OrderListCard key={order.id} order={order} />)}
      </div>

      <p className="mt-4 text-center text-xs text-[var(--muted)]">
        Showing {orders.length} of {pagination.total} {pagination.total === 1 ? "order" : "orders"}
      </p>

      {pagination.totalPages > 1 ? (
        <nav
          aria-label="Orders pagination"
          className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white p-3 text-sm"
        >
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          {visiblePages.map((pageNumber, index) => {
            const previousPage = visiblePages[index - 1];
            return (
              <span className="flex items-center gap-2" key={pageNumber}>
                {previousPage && pageNumber - previousPage > 1 ? (
                  <span className="text-xs text-[var(--muted)]">...</span>
                ) : null}
                <button
                  aria-current={pageNumber === page ? "page" : undefined}
                  className={`focus-ring inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 font-semibold transition ${
                    pageNumber === page
                      ? "border-[var(--leaf)] bg-[var(--leaf)] text-white"
                      : "border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[var(--leaf)]"
                  }`}
                  disabled={isLoading}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              </span>
            );
          })}
          <Button
            type="button"
            variant="secondary"
            disabled={page >= pagination.totalPages || isLoading}
            onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
          >
            Next
          </Button>
        </nav>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 text-center text-sm font-semibold text-[var(--coral)]" role="status">{errorMessage}</p>
      ) : null}
    </section>
  );
}
