"use client";

import { useEffect, useMemo } from "react";
import { useCartStore } from "@/stores/cart-store";

const PRICING_SYNC_DEBOUNCE_MS = 40;

type CartSummary = {
  originalSubtotal: number;
  subtotal: number;
  baseSavings: number;
  promoCode: string | null;
  promoDiscount: number;
  discountedSubtotal: number;
  gst: number;
  shipping: number;
  total: number;
  totalSavings: number;
  freeShippingThreshold: number;
  remainingForFreeShipping: number;
};

const EMPTY_SUMMARY: CartSummary = {
  originalSubtotal: 0,
  subtotal: 0,
  baseSavings: 0,
  promoCode: null,
  promoDiscount: 0,
  discountedSubtotal: 0,
  gst: 0,
  shipping: 0,
  total: 0,
  totalSavings: 0,
  freeShippingThreshold: 0,
  remainingForFreeShipping: 0
};

export function useCartPricing() {
  const items = useCartStore((state) => state.items);
  const promoCode = useCartStore((state) => state.promoCode);
  const pricing = useCartStore((state) => state.pricing);
  const pricingError = useCartStore((state) => state.pricingError);
  const isPricingLoading = useCartStore((state) => state.isPricingLoading);
  const syncPricing = useCartStore((state) => state.syncPricing);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncPricing();
    }, PRICING_SYNC_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [items, promoCode, syncPricing]);

  const hasFreshBackendPricing = useMemo(() => {
    if (!pricing) return false;
    if (pricing.items.length !== items.length) return false;
    if ((pricing.summary.promoCode ?? null) !== (promoCode ?? null)) return false;

    return items.every((item) => {
      const pricedItem = pricing.items.find(
        (candidate) => candidate.productId === item.productId && candidate.variantId === item.variantId
      );
      return Boolean(pricedItem && pricedItem.quantity === item.quantity);
    });
  }, [items, pricing, promoCode]);

  const summary = hasFreshBackendPricing && pricing ? pricing.summary : { ...EMPTY_SUMMARY, promoCode };
  const isPricingPending = items.length > 0 && !hasFreshBackendPricing && !pricingError;
  const enrichedItems = useMemo(() => items.map((item) => {
    const pricedItem = hasFreshBackendPricing
      ? pricing?.items.find(
          (candidate) => candidate.productId === item.productId && candidate.variantId === item.variantId
        )
      : undefined;
    const effectiveUnitPrice = pricedItem?.unitPrice ?? 0;
    const compareAtUnitPrice = pricedItem?.compareAtUnitPrice ?? effectiveUnitPrice;

    return {
      ...item,
      slug: pricedItem?.slug ?? item.slug,
      name: pricedItem?.name ?? item.name,
      image: pricedItem?.image ?? "",
      variantLabel: pricedItem?.variantLabel ?? item.variantLabel,
      unitPrice: effectiveUnitPrice,
      compareAtUnitPrice,
      lineTotal: pricedItem?.lineTotal ?? effectiveUnitPrice * item.quantity,
      compareAtTotal: compareAtUnitPrice * item.quantity,
      lineSavings: Math.max(0, compareAtUnitPrice * item.quantity - (pricedItem?.lineTotal ?? effectiveUnitPrice * item.quantity)),
      available: pricedItem?.available ?? true,
      stock: pricedItem?.stock ?? Number.POSITIVE_INFINITY
    };
  }), [hasFreshBackendPricing, items, pricing]);

  return {
    summary,
    enrichedItems,
    pricing,
    pricingError,
    isPricingLoading,
    isBackendPricing: hasFreshBackendPricing,
    isPricingPending,
    shippingProgress: summary.freeShippingThreshold
      ? Math.min(100, Math.round((summary.discountedSubtotal / summary.freeShippingThreshold) * 100))
      : 0
  };
}
