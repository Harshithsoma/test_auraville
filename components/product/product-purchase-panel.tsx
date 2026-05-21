"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useNotifyMe } from "@/hooks/use-notify-me";
import { Button } from "@/components/ui/button";
import { Price, PriceWithCompare } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { getVariantCompareAtPrice, selectDefaultProductVariant } from "@/components/product/card-variant";

type ProductPurchasePanelProps = {
  product: Product;
  selectedVariantId?: string;
  onSelectedVariantIdChange?: (variantId: string) => void;
};

function shouldShowVariantUnit(label: string, unit: string): boolean {
  const normalizedLabel = label.trim().toLowerCase();
  const normalizedUnit = unit.trim().toLowerCase();
  if (!normalizedUnit) return false;
  return !normalizedLabel.includes(normalizedUnit);
}

export function ProductPurchasePanel({
  product,
  selectedVariantId,
  onSelectedVariantIdChange
}: ProductPurchasePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const getAvailableStock = useCartStore((state) => state.getAvailableStock);
  const pushCartNotice = useCartStore((state) => state.pushCartNotice);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("");
  const attemptedAutoNotifyRef = useRef(false);
  const isAvailable = product.availability === "available";
  const defaultVariant = useMemo(() => selectDefaultProductVariant(product.variants), [product.variants]);
  const isControlled = typeof selectedVariantId === "string" && typeof onSelectedVariantIdChange === "function";
  const [internalVariantId, setInternalVariantId] = useState(defaultVariant?.id ?? "");
  const effectiveVariantId = isControlled
    ? selectedVariantId
    : internalVariantId || defaultVariant?.id || "";
  const { notify, isSubmitting: isNotifySubmitting } = useNotifyMe({
    onSuccess: (message) => setStatus(message),
    onError: (message) => setStatus(message)
  });

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    const exists = product.variants.some((variant) => variant.id === selectedVariantId);
    if (!exists && defaultVariant) {
      onSelectedVariantIdChange(defaultVariant.id);
    }
  }, [defaultVariant, isControlled, onSelectedVariantIdChange, product.variants, selectedVariantId]);

  const selectedVariant = useMemo(() => {
    const byId = product.variants.find((variant) => variant.id === effectiveVariantId);
    return byId ?? defaultVariant ?? null;
  }, [defaultVariant, effectiveVariantId, product.variants]);

  const selectedVariantStock =
    selectedVariant
      ? getAvailableStock(product.id, selectedVariant.id) ?? selectedVariant.stock ?? null
      : null;
  const hasAnyInStockVariant = product.variants.some(
    (variant) => (getAvailableStock(product.id, variant.id) ?? variant.stock ?? 0) > 0
  );
  const isOutOfStock = typeof selectedVariantStock === "number" && selectedVariantStock <= 0;
  const hasLimitedStock = typeof selectedVariantStock === "number" && selectedVariantStock > 0;
  const effectiveQuantity = hasLimitedStock
    ? Math.min(Math.max(1, quantity), selectedVariantStock)
    : Math.max(1, quantity);
  const compareAtForVariant = selectedVariant ? getVariantCompareAtPrice(product, selectedVariant) : undefined;

  useEffect(() => {
    if (attemptedAutoNotifyRef.current) {
      return;
    }

    const shouldAutoNotify = searchParams.get("notify") === "1";
    if (!shouldAutoNotify) {
      return;
    }

    const requestedProductId = searchParams.get("notifyProductId");
    if (requestedProductId && requestedProductId !== product.id) {
      return;
    }

    if (!hasHydrated || !user) {
      return;
    }

    attemptedAutoNotifyRef.current = true;
    void notify(
      {
        id: product.id,
        slug: product.slug
      },
      { redirectGuest: false }
    ).finally(() => {
      router.replace(`/product/${product.slug}`, { scroll: false });
    });
  }, [hasHydrated, notify, product.id, product.slug, router, searchParams, user]);

  function setCurrentVariant(nextVariantId: string) {
    setStatus("");
    if (isControlled) {
      onSelectedVariantIdChange(nextVariantId);
      return;
    }
    setInternalVariantId(nextVariantId);
  }

  if (!selectedVariant) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_18px_45px_rgb(23_33_28_/_8%)] sm:p-5">
        <p className="text-sm font-semibold text-[var(--coral)]">Product unavailable right now.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          This product has no active variants currently. Please check back soon.
        </p>
        <Button
          className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[var(--mint)] text-sm font-semibold text-[var(--leaf-deep)] hover:bg-[var(--mint)]/80"
          disabled={isNotifySubmitting}
          type="button"
          variant="secondary"
          onClick={() => {
            void notify({ id: product.id, slug: product.slug });
          }}
        >
          {isNotifySubmitting ? "Saving..." : "Notify Me"}
        </Button>
      </div>
    );
  }

  function addToCart() {
    if (!selectedVariant) {
      return;
    }

    if (!isAvailable) {
      setStatus(`${product.name} is coming soon.`);
      return;
    }

    if (isOutOfStock) {
      const notice = "No more quantity available.";
      setStatus(notice);
      pushCartNotice(notice);
      return;
    }

    if (hasLimitedStock && selectedVariantStock !== null && effectiveQuantity > selectedVariantStock) {
      const notice =
        selectedVariantStock === 1
          ? "Only 1 left in stock."
          : `Only ${selectedVariantStock} left in stock.`;
      setStatus(notice);
      pushCartNotice(notice);
      return;
    }

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      variantId: selectedVariant.id,
      variantLabel: selectedVariant.label,
      unitPrice: selectedVariant.price,
      quantity: effectiveQuantity
    });
    setStatus(`${product.name} added to cart.`);
    openDrawer();
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_18px_45px_rgb(23_33_28_/_8%)] sm:p-5">
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {isAvailable ? "Select Variant" : "Planned Variants"}
        </legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {product.variants.map((variant) => {
            const variantStock = getAvailableStock(product.id, variant.id) ?? variant.stock ?? null;
            const variantIsOut = typeof variantStock === "number" && variantStock <= 0;
            const variantIsLow = typeof variantStock === "number" && variantStock > 0 && variantStock <= 5;
            const isSelected = selectedVariant.id === variant.id;

            return (
              <label
                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                  variantIsOut
                    ? "border-[#f2d5d3] bg-[#fff8f8] text-[#8f5550]"
                    : "border-[var(--line)] bg-[var(--background)]"
                } ${isSelected ? "border-[var(--leaf)] bg-[var(--mint)] shadow-[inset_0_0_0_1px_var(--leaf)]" : ""}`}
                key={variant.id}
              >
                <input
                  checked={isSelected}
                  className="sr-only"
                  disabled={!isAvailable}
                  name="variant"
                  type="radio"
                  value={variant.id}
                  onChange={() => setCurrentVariant(variant.id)}
                />
                <span className="block text-sm font-semibold">{variant.label}</span>
                {shouldShowVariantUnit(variant.label, variant.unit) ? (
                  <span className="mt-1 block text-xs text-[var(--muted)]">{variant.unit}</span>
                ) : null}
                <span className="mt-2 block text-sm font-semibold">
                  <Price currency={product.currency} value={variant.price} />
                </span>
                {variantIsOut ? (
                  <span className="mt-1 block text-xs font-semibold text-[var(--coral)]">Out of stock</span>
                ) : variantIsLow ? (
                  <span className="mt-1 block text-xs font-semibold text-[var(--coral)]">
                    {variantStock === 1 ? "Only 1 left" : `Only ${variantStock} left`}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--mint)]/45 px-3.5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Selected variant price</p>
        {isAvailable ? (
          <div className="mt-1 text-lg font-semibold sm:text-xl">
            <PriceWithCompare
              compareAtPrice={compareAtForVariant}
              currency={product.currency}
              value={selectedVariant.price}
            />
          </div>
        ) : (
          <p className="mt-1 text-base font-semibold">Coming soon</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--mint)]/45 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Quantity</p>
          <div className="mt-2">
            {isAvailable && !isOutOfStock ? (
              <QuantityStepper
                value={effectiveQuantity}
                max={typeof selectedVariantStock === "number" ? Math.max(1, selectedVariantStock) : undefined}
                onChange={(nextValue) => {
                  if (typeof selectedVariantStock === "number" && selectedVariantStock > 0) {
                    setQuantity(Math.min(Math.max(1, nextValue), selectedVariantStock));
                    return;
                  }
                  setQuantity(Math.max(1, nextValue));
                }}
              />
            ) : (
              <span className="inline-flex h-11 items-center rounded-lg border border-[var(--line)] bg-[var(--mint)] px-4 text-sm font-semibold text-[var(--leaf-deep)]">
                {isAvailable ? "Out of stock" : "Launching soon"}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total</p>
          {isAvailable ? (
            <div className="mt-1 text-lg font-semibold sm:text-xl">
              <PriceWithCompare
                compareAtPrice={compareAtForVariant ? compareAtForVariant * effectiveQuantity : undefined}
                currency={product.currency}
                showSavingsPill={false}
                value={selectedVariant.price * effectiveQuantity}
              />
            </div>
          ) : (
            <p className="mt-1 text-base font-semibold">Coming soon</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-[var(--leaf-deep)] p-1.5">
        <Button
          className="w-full rounded-[10px] border border-transparent bg-[var(--leaf-deep)] text-base font-bold tracking-wide text-white hover:bg-[var(--leaf)]"
          disabled={!isAvailable || isOutOfStock || !hasAnyInStockVariant}
          type="button"
          onClick={addToCart}
        >
          {isAvailable ? (isOutOfStock ? "Out of Stock" : "Add to Cart") : "Coming Soon"}
        </Button>
      </div>
      {!isAvailable || isOutOfStock || !hasAnyInStockVariant ? (
        <Button
          className="mt-3 w-full rounded-xl border border-[var(--line)] bg-[var(--mint)] text-sm font-semibold text-[var(--leaf-deep)] hover:bg-[var(--mint)]/80"
          disabled={isNotifySubmitting}
          type="button"
          variant="secondary"
          onClick={() => {
            void notify({ id: product.id, slug: product.slug });
          }}
        >
          {isNotifySubmitting ? "Saving..." : "Notify Me"}
        </Button>
      ) : null}
      <p className="mt-2 min-h-5 text-xs font-medium text-[var(--muted)]" aria-live="polite">
        {isOutOfStock
          ? "This pack is currently unavailable."
          : hasLimitedStock && selectedVariantStock <= 5
            ? selectedVariantStock === 1
              ? "Only 1 left in stock."
              : `Only ${selectedVariantStock} left in stock.`
            : ""}
      </p>
      <p className="mt-3 min-h-6 text-sm font-semibold text-[var(--leaf-deep)]" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
