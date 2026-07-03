"use client";

import { useEffect, useMemo } from "react";
import { getCompareAtUnitPrice } from "@/lib/products";
import { useCartStore } from "@/stores/cart-store";

const FALLBACK_FREE_SHIPPING_THRESHOLD = 499;
const FALLBACK_SHIPPING_FEE = 99;
const PRICING_SYNC_DEBOUNCE_MS = 90;

type FallbackSummary = {
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

    return items.every((item) => {
      const pricedItem = pricing.items.find(
        (candidate) => candidate.productId === item.productId && candidate.variantId === item.variantId
      );
      return Boolean(pricedItem && pricedItem.quantity === item.quantity);
    });
  }, [items, pricing]);

  const fallbackSummary: FallbackSummary = useMemo(() => {
    const originalSubtotal = items.reduce((total, item) => {
      const compareAtUnitPrice = getCompareAtUnitPrice(item.productId, item.unitPrice);
      return total + compareAtUnitPrice * item.quantity;
    }, 0);
    const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const baseSavings = Math.max(0, originalSubtotal - subtotal);
    const promoDiscount = 0;
    const discountedSubtotal = subtotal;
    const gst = 0;
    const shipping =
      discountedSubtotal >= FALLBACK_FREE_SHIPPING_THRESHOLD || discountedSubtotal === 0
        ? 0
        : FALLBACK_SHIPPING_FEE;
    const total = discountedSubtotal + shipping;
    const totalSavings = baseSavings + promoDiscount;

    return {
      originalSubtotal,
      subtotal,
      baseSavings,
      promoCode,
      promoDiscount,
      discountedSubtotal,
      gst,
      shipping,
      total,
      totalSavings,
      freeShippingThreshold: FALLBACK_FREE_SHIPPING_THRESHOLD,
      remainingForFreeShipping: Math.max(0, FALLBACK_FREE_SHIPPING_THRESHOLD - discountedSubtotal)
    };
  }, [items, promoCode]);

  const summary = hasFreshBackendPricing && pricing ? pricing.summary : fallbackSummary;
  const enrichedItems = useMemo(() => items.map((item) => {
    const pricedItem = hasFreshBackendPricing
      ? pricing?.items.find(
          (candidate) => candidate.productId === item.productId && candidate.variantId === item.variantId
        )
      : undefined;
    const effectiveUnitPrice = pricedItem?.unitPrice ?? item.unitPrice;
    const compareAtUnitPrice =
      pricedItem?.compareAtUnitPrice ?? getCompareAtUnitPrice(item.productId, effectiveUnitPrice);

    return {
      ...item,
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
    shippingProgress: summary.freeShippingThreshold
      ? Math.min(100, Math.round((summary.discountedSubtotal / summary.freeShippingThreshold) * 100))
      : 0
  };
}
