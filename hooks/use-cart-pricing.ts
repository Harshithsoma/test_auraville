"use client";

import { useEffect } from "react";
import { getCompareAtUnitPrice } from "@/lib/products";
import { useCartStore } from "@/stores/cart-store";

const FALLBACK_FREE_SHIPPING_THRESHOLD = 1499;
const FALLBACK_SHIPPING_FEE = 99;
const FALLBACK_GST_RATE = 0.05;

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
    void syncPricing();
  }, [items, promoCode, syncPricing]);

  const fallbackSummary: FallbackSummary = (() => {
    const originalSubtotal = items.reduce((total, item) => {
      const compareAtUnitPrice = getCompareAtUnitPrice(item.productId, item.unitPrice);
      return total + compareAtUnitPrice * item.quantity;
    }, 0);
    const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const baseSavings = Math.max(0, originalSubtotal - subtotal);
    const promoDiscount = 0;
    const discountedSubtotal = subtotal;
    const gst = Math.round(discountedSubtotal * FALLBACK_GST_RATE);
    const shipping =
      discountedSubtotal >= FALLBACK_FREE_SHIPPING_THRESHOLD || discountedSubtotal === 0
        ? 0
        : FALLBACK_SHIPPING_FEE;
    const total = discountedSubtotal + gst + shipping;
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
  })();

  const summary = pricing?.summary ?? fallbackSummary;
  const enrichedItems = items.map((item) => {
    const pricedItem = pricing?.items.find(
      (candidate) => candidate.productId === item.productId && candidate.variantId === item.variantId
    );
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
      stock: pricedItem?.stock ?? 0
    };
  });

  return {
    summary,
    enrichedItems,
    pricing,
    pricingError,
    isPricingLoading,
    isBackendPricing: Boolean(pricing),
    shippingProgress: summary.freeShippingThreshold
      ? Math.min(100, Math.round((summary.discountedSubtotal / summary.freeShippingThreshold) * 100))
      : 0
  };
}
