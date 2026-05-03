"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_failed";

type PaymentStatus = "created" | "paid" | "failed" | "refunded" | null;

type AdminOrderSummary = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  customer: {
    userId: string | null;
    name: string;
    email: string;
    phone: string;
  };
  pricing: {
    subtotal: number;
    promoDiscount: number;
    gst: number;
    shipping: number;
    total: number;
  };
  payment: {
    status: PaymentStatus;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    amount: number | null;
    currency: string | null;
  };
};

type AdminOrderDetail = AdminOrderSummary & {
  couponCode: string | null;
  items: Array<{
    productId: string;
    variantId: string;
    slug: string;
    name: string;
    image: string;
    variantLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  shippingAddress: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    pincode: string;
    country: string;
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

type GetOrderDetailResponse = {
  data: AdminOrderDetail;
};

type PatchOrderStatusResponse = {
  data: {
    id: string;
    status: OrderStatus;
  };
};

type Filters = {
  status: "all" | OrderStatus;
  email: string;
  dateFrom: string;
  dateTo: string;
};

const orderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed"
];

const defaultFilters: Filters = {
  status: "all",
  email: "",
  dateFrom: "",
  dateTo: ""
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

function toDateStart(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function toDateEnd(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(`${trimmed}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function AdminOrdersClient() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("pending");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const listQuery = useMemo(
    () => ({
      page,
      limit,
      status: filters.status === "all" ? undefined : filters.status,
      email: filters.email.trim() || undefined,
      dateFrom: toDateStart(filters.dateFrom),
      dateTo: toDateEnd(filters.dateTo)
    }),
    [filters.dateFrom, filters.dateTo, filters.email, filters.status, limit, page]
  );

  const loadOrders = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);

    try {
      const response = await commerceApi.admin.orders.list<ListOrdersResponse>(listQuery);
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to load orders.");
      }
    } finally {
      setIsLoadingList(false);
    }
  }, [listQuery]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const loadOrderDetail = useCallback(async (orderId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setDetailMessage(null);

    try {
      const response = await commerceApi.admin.orders.byId<GetOrderDetailResponse>(orderId);
      setDetail(response.data);
      setStatusDraft(response.data.status);
    } catch (error) {
      setDetail(null);
      if (error instanceof ApiError) {
        setDetailError(error.message);
      } else {
        setDetailError("Unable to load order detail.");
      }
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      setDetail(null);
      setDetailError(null);
      setDetailMessage(null);
      return;
    }

    void loadOrderDetail(selectedOrderId);
  }, [loadOrderDetail, selectedOrderId]);

  async function onUpdateStatus() {
    if (!detail) return;

    setIsSavingStatus(true);
    setDetailError(null);
    setDetailMessage(null);

    try {
      const response = await commerceApi.admin.orders.updateStatus<
        PatchOrderStatusResponse,
        { status: OrderStatus }
      >(detail.id, { status: statusDraft });

      setDetail((current) => (current ? { ...current, status: response.data.status } : current));
      setOrders((current) =>
        current.map((entry) =>
          entry.id === response.data.id ? { ...entry, status: response.data.status } : entry
        )
      );
      setDetailMessage(`Order status updated to ${response.data.status}.`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "INVALID_STATUS_TRANSITION") {
          setDetailError("This status transition is blocked for order safety.");
        } else {
          setDetailError(error.message);
        }
      } else {
        setDetailError("Unable to update order status.");
      }
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Orders</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">View and manage order lifecycle status.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadOrders()}>
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Status</span>
            <Select
              className="mt-2"
              value={filters.status}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, status: event.target.value as Filters["status"] }));
              }}
            >
              <option value="all">All</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Customer Email</span>
            <Input
              className="mt-2"
              placeholder="email@example.com"
              value={filters.email}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, email: event.target.value }));
              }}
            />
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Items/Page</span>
            <Select
              className="mt-2"
              value={String(limit)}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Date From</span>
            <Input
              className="mt-2"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, dateFrom: event.target.value }));
              }}
            />
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Date To</span>
            <Input
              className="mt-2"
              type="date"
              value={filters.dateTo}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, dateTo: event.target.value }));
              }}
            />
          </label>
        </div>

        {listError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {listError}
          </div>
        ) : null}

        {isLoadingList ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            No orders found for current filters.
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto rounded-lg border border-[var(--line)] lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--mint)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3">Order</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr className="border-t border-[var(--line)]" key={order.id}>
                      <td className="px-3 py-3 font-semibold">{order.id}</td>
                      <td className="px-3 py-3">{order.status}</td>
                      <td className="px-3 py-3 text-xs">
                        <p>{order.customer.name}</p>
                        <p>{order.customer.email}</p>
                        <p>{order.customer.phone}</p>
                      </td>
                      <td className="px-3 py-3">{formatPrice(order.pricing.total)}</td>
                      <td className="px-3 py-3">{order.payment.status ?? "-"}</td>
                      <td className="px-3 py-3 text-xs">{formatDate(order.createdAt)}</td>
                      <td className="px-3 py-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              {orders.map((order) => (
                <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={order.id}>
                  <p className="font-semibold">{order.id}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {order.status} | {order.payment.status ?? "-"} | {formatDate(order.createdAt)}
                  </p>
                  <p className="mt-2 text-sm">
                    {order.customer.name} ({order.customer.email})
                  </p>
                  <p className="text-sm">{order.customer.phone}</p>
                  <p className="mt-2 text-sm font-semibold">{formatPrice(order.pricing.total)}</p>
                  <div className="mt-3">
                    <Button type="button" variant="secondary" onClick={() => setSelectedOrderId(order.id)}>
                      View
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-[var(--muted)]">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ({pagination.total} orders)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pagination.totalPages === 0 || page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Order Detail</h2>
          {selectedOrderId ? (
            <Button type="button" variant="ghost" onClick={() => setSelectedOrderId(null)}>
              Clear
            </Button>
          ) : null}
        </div>

        {!selectedOrderId ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Select an order from the list to view full details.</p>
        ) : isLoadingDetail ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            Loading order detail...
          </div>
        ) : detailError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {detailError}
          </div>
        ) : detail ? (
          <div className="mt-5 space-y-5">
            {detailMessage ? (
              <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
                {detailMessage}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm">
                <h3 className="font-semibold">Customer</h3>
                <p className="mt-2">{detail.customer.name}</p>
                <p>{detail.customer.email}</p>
                <p>{detail.customer.phone}</p>
              </article>

              <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm">
                <h3 className="font-semibold">Shipping Address</h3>
                <p className="mt-2">{detail.shippingAddress.addressLine1}</p>
                {detail.shippingAddress.addressLine2 ? <p>{detail.shippingAddress.addressLine2}</p> : null}
                <p>
                  {detail.shippingAddress.city}, {detail.shippingAddress.state ?? "-"} {detail.shippingAddress.pincode}
                </p>
                <p>{detail.shippingAddress.country}</p>
              </article>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-white p-4">
              <h3 className="font-semibold">Items</h3>
              <div className="mt-3 space-y-3 text-sm">
                {detail.items.map((item) => (
                  <div className="rounded border border-[var(--line)] bg-[var(--mint)] p-3" key={`${item.productId}-${item.variantId}`}>
                    <p className="font-semibold">
                      {item.name} ({item.variantLabel})
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {item.slug} | {item.productId} | variant: {item.variantId}
                    </p>
                    <p className="mt-1">
                      {item.quantity} x {formatPrice(item.unitPrice)} = {formatPrice(item.lineTotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm">
                <h3 className="font-semibold">Pricing</h3>
                <p className="mt-2">Subtotal: {formatPrice(detail.pricing.subtotal)}</p>
                <p>Promo Discount: {formatPrice(detail.pricing.promoDiscount)}</p>
                <p>GST: {formatPrice(detail.pricing.gst)}</p>
                <p>Shipping: {formatPrice(detail.pricing.shipping)}</p>
                <p className="mt-1 font-semibold">Total: {formatPrice(detail.pricing.total)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Coupon: {detail.couponCode ?? "-"}</p>
              </article>

              <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm">
                <h3 className="font-semibold">Payment</h3>
                <p className="mt-2">Status: {detail.payment.status ?? "-"}</p>
                <p>Amount: {detail.payment.amount !== null ? formatPrice(detail.payment.amount) : "-"}</p>
                <p>Currency: {detail.payment.currency ?? "-"}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Razorpay Order: {detail.payment.razorpayOrderId ?? "-"}</p>
                <p className="text-xs text-[var(--muted)]">Razorpay Payment: {detail.payment.razorpayPaymentId ?? "-"}</p>
              </article>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-white p-4">
              <h3 className="font-semibold">Update Status</h3>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="w-full max-w-xs">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Order Status</span>
                  <Select
                    className="mt-2"
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button type="button" disabled={isSavingStatus} onClick={() => void onUpdateStatus()}>
                  {isSavingStatus ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
