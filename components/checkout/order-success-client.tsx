"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/price";

type LastOrderReference = {
  id: string;
  total?: number;
};

type OrderDetailResponse = {
  data: {
    id: string;
    email: string;
    items: Array<{
      productId: string;
      slug: string;
      name: string;
      image: string;
      variantId: string;
      variantLabel: string;
      unitPrice: number;
      quantity: number;
    }>;
    pricing: {
      subtotal: number;
      promoDiscount: number;
      gst: number;
      shipping: number;
      total: number;
    };
    status: string;
    createdAt: string;
  };
};

function readLastOrderReference(): LastOrderReference | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawOrder = sessionStorage.getItem("auraville-last-order-reference");
  if (!rawOrder) {
    return null;
  }

  try {
    return JSON.parse(rawOrder) as LastOrderReference;
  } catch {
    return null;
  }
}

export function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const user = useAuthStore((state) => state.user);

  const [orderDetail, setOrderDetail] = useState<OrderDetailResponse["data"] | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fallbackReference = useMemo(() => readLastOrderReference(), []);
  const referenceId = orderId ?? fallbackReference?.id ?? "AUR-PENDING";

  useEffect(() => {
    if (!user || !orderId) {
      return;
    }
    const currentOrderId = orderId;

    let isCancelled = false;

    async function loadOrderDetail() {
      setIsLoadingDetail(true);
      setDetailError(null);
      try {
        const response = await commerceApi.orders.byId<OrderDetailResponse>(currentOrderId);
        if (!isCancelled) {
          setOrderDetail(response.data);
        }
      } catch (error) {
        if (!isCancelled) {
          if (error instanceof ApiError) {
            setDetailError(error.message);
          } else {
            setDetailError("Unable to load full order details right now.");
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadOrderDetail();

    return () => {
      isCancelled = true;
    };
  }, [orderId, user]);

  return (
    <section className="mx-auto max-w-3xl rounded-lg border border-[var(--line)] bg-white p-6 text-center md:p-10">
      <p className="text-sm font-semibold uppercase text-[var(--coral)]">Order confirmed</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight">Your Auraville order is in.</h1>
      <p className="mt-4 text-base leading-7 text-[var(--muted)]">
        Payment verification is complete. We will send dispatch updates to your email.
      </p>
      <div className="mt-8 rounded-lg bg-[var(--mint)] p-5 text-left">
        <h2 className="font-semibold">Order summary</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Reference: {referenceId}</p>

        {isLoadingDetail ? <p className="mt-4 text-sm text-[var(--muted)]">Loading order details...</p> : null}

        {orderDetail ? (
          <>
            <ul className="mt-5 space-y-3 text-sm">
              {orderDetail.items.map((item) => (
                <li className="flex justify-between gap-4" key={`${orderDetail.id}-${item.productId}-${item.variantId}`}>
                  <span>
                    {item.quantity} x {item.name} ({item.variantLabel})
                  </span>
                  <span className="font-semibold">{formatPrice(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-[var(--line)] pt-4 text-right font-semibold">
              Total {formatPrice(orderDetail.pricing.total)}
            </p>
          </>
        ) : fallbackReference?.total ? (
          <p className="mt-4 border-t border-[var(--line)] pt-4 text-right font-semibold">
            Total {formatPrice(fallbackReference.total)}
          </p>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">Detailed order items are available in your account order history.</p>
        )}

        {detailError ? <p className="mt-4 text-xs font-semibold text-[var(--coral)]">{detailError}</p> : null}
      </div>
      <Button className="mt-8" href="/orders">
        View orders
      </Button>
    </section>
  );
}
