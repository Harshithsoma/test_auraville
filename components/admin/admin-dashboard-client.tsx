"use client";

import { useEffect, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/price";

type AdminOrderSummary = {
  id: string;
  status: "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "payment_failed";
  pricing: {
    total: number;
  };
  payment: {
    status: "created" | "paid" | "failed" | "refunded" | null;
  };
};

type ListOrdersResponse = {
  data: AdminOrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type AdminVariant = {
  stock: number;
  isActive: boolean;
};

type AdminProduct = {
  variants: AdminVariant[];
  isActive: boolean;
};

type ListProductsResponse = {
  data: AdminProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type DashboardMetrics = {
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
};

const LOW_STOCK_THRESHOLD = 10;
const SUCCESSFUL_ORDER_STATUSES = new Set([
  "confirmed",
  "packed",
  "shipped",
  "delivered"
]);

function getTodayRangeIso() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    from: start.toISOString(),
    to: end.toISOString()
  };
}

async function loadAllTodayOrders(): Promise<AdminOrderSummary[]> {
  const { from, to } = getTodayRangeIso();
  const first = await commerceApi.admin.orders.list<ListOrdersResponse>({
    page: 1,
    limit: 100,
    dateFrom: from,
    dateTo: to
  });

  let all = [...first.data];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const response = await commerceApi.admin.orders.list<ListOrdersResponse>({
      page,
      limit: 100,
      dateFrom: from,
      dateTo: to
    });
    all = [...all, ...response.data];
  }
  return all;
}

async function loadLowStockProductsCount(): Promise<number> {
  const first = await commerceApi.admin.products.list<ListProductsResponse>({
    page: 1,
    limit: 100,
    isActive: true
  });

  let products = [...first.data];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const response = await commerceApi.admin.products.list<ListProductsResponse>({
      page,
      limit: 100,
      isActive: true
    });
    products = [...products, ...response.data];
  }

  return products.filter((product) => {
    const activeVariants = product.variants.filter((variant) => variant.isActive);
    return activeVariants.some((variant) => variant.stock <= LOW_STOCK_THRESHOLD);
  }).length;
}

export function AdminDashboardClient() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadMetrics() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [totalOrdersRes, pendingOrdersRes, todayOrders, lowStockProducts] = await Promise.all([
        commerceApi.admin.orders.list<ListOrdersResponse>({ page: 1, limit: 1 }),
        commerceApi.admin.orders.list<ListOrdersResponse>({ page: 1, limit: 1, status: "pending" }),
        loadAllTodayOrders(),
        loadLowStockProductsCount()
      ]);

      const todayRevenue = todayOrders
        .filter(
          (order) =>
            order.payment.status === "paid" &&
            SUCCESSFUL_ORDER_STATUSES.has(order.status)
        )
        .reduce((sum, order) => sum + order.pricing.total, 0);

      setMetrics({
        totalOrders: totalOrdersRes.pagination.total,
        todayOrders: todayOrders.length,
        todayRevenue,
        pendingOrders: pendingOrdersRes.pagination.total,
        lowStockProducts
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load admin dashboard metrics.");
      }
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMetrics();
  }, []);

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold">Auraville admin workspace</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Launch-critical operations snapshot for orders and catalog.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadMetrics()} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total Orders</p>
          <p className="mt-2 text-2xl font-semibold">{metrics?.totalOrders ?? (isLoading ? "..." : "0")}</p>
          <Button className="mt-4" href="/admin/orders" variant="secondary">
            View orders
          </Button>
        </article>

        <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Today Orders</p>
          <p className="mt-2 text-2xl font-semibold">{metrics?.todayOrders ?? (isLoading ? "..." : "0")}</p>
          <Button className="mt-4" href="/admin/orders" variant="secondary">
            Open today orders
          </Button>
        </article>

        <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Today Revenue</p>
          <p className="mt-2 text-2xl font-semibold">
            {metrics ? formatPrice(metrics.todayRevenue) : isLoading ? "..." : formatPrice(0)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Successful paid orders only</p>
          <Button className="mt-4" href="/admin/orders" variant="secondary">
            Open revenue orders
          </Button>
        </article>

        <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Pending Orders</p>
          <p className="mt-2 text-2xl font-semibold">{metrics?.pendingOrders ?? (isLoading ? "..." : "0")}</p>
          <Button className="mt-4" href="/admin/orders" variant="secondary">
            Fulfillment queue
          </Button>
        </article>

        <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Low Stock Products</p>
          <p className="mt-2 text-2xl font-semibold">{metrics?.lowStockProducts ?? (isLoading ? "..." : "0")}</p>
          <Button className="mt-4" href="/admin/products" variant="secondary">
            Check inventory
          </Button>
        </article>
      </div>
    </section>
  );
}
