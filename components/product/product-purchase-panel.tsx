"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Price, PriceWithCompare } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { getVariantCompareAtPrice, selectDefaultProductVariant, sortVariantsLogically } from "@/components/product/card-variant";
import { isVariantActive } from "@/lib/product-lifecycle";

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
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const getAvailableStock = useCartStore((state) => state.getAvailableStock);
  const pushCartNotice = useCartStore((state) => state.pushCartNotice);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("");
  const sortedVariants = useMemo(() => sortVariantsLogically(product.variants), [product.variants]);
  const defaultVariant = useMemo(() => selectDefaultProductVariant(sortedVariants), [sortedVariants]);
  const isControlled = typeof selectedVariantId === "string" && typeof onSelectedVariantIdChange === "function";
  const [internalVariantId, setInternalVariantId] = useState(defaultVariant?.id ?? "");
  const effectiveVariantId = isControlled
    ? selectedVariantId
    : internalVariantId || defaultVariant?.id || "";

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    const exists = sortedVariants.some((variant) => variant.id === selectedVariantId);
    if (!exists && defaultVariant) {
      onSelectedVariantIdChange(defaultVariant.id);
    }
  }, [defaultVariant, isControlled, onSelectedVariantIdChange, selectedVariantId, sortedVariants]);

  const selectedVariant = useMemo(() => {
    const byId = sortedVariants.find((variant) => variant.id === effectiveVariantId);
    return byId ?? defaultVariant ?? null;
  }, [defaultVariant, effectiveVariantId, sortedVariants]);

  const selectedVariantStock =
    selectedVariant
      ? getAvailableStock(product.id, selectedVariant.id) ?? selectedVariant.stock ?? null
      : null;
  const hasAnyInStockVariant = sortedVariants.some(
    (variant) => isVariantActive(variant) && (getAvailableStock(product.id, variant.id) ?? variant.stock ?? 0) > 0
  );
  const selectedVariantIsActive = isVariantActive(selectedVariant);
  const isOutOfStock = typeof selectedVariantStock === "number" && selectedVariantStock <= 0;
  const hasLimitedStock = typeof selectedVariantStock === "number" && selectedVariantStock > 0;
  const selectedVariantCanPurchase = selectedVariantIsActive && !isOutOfStock;
  const effectiveQuantity = hasLimitedStock
    ? Math.min(Math.max(1, quantity), selectedVariantStock)
    : Math.max(1, quantity);
  const compareAtForVariant = selectedVariant ? getVariantCompareAtPrice(product, selectedVariant) : undefined;


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
          This product has no purchasable variants currently. Please check back soon.
        </p>
      </div>
    );
  }

  function addToCart() {
    if (!selectedVariant) {
      return;
    }

    if (!selectedVariantIsActive) {
      setStatus(`${selectedVariant.label} is coming soon.`);
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
          Select Variant
        </legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {sortedVariants.map((variant) => {
            const variantStock = getAvailableStock(product.id, variant.id) ?? variant.stock ?? null;
            const variantIsActive = isVariantActive(variant);
            const variantIsOut = typeof variantStock === "number" && variantStock <= 0;
            const variantIsLow = variantIsActive && typeof variantStock === "number" && variantStock > 0 && variantStock <= 5;
            const isSelected = selectedVariant.id === variant.id;

            return (
              <label
                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                  !variantIsActive || variantIsOut
                    ? "border-[#f2d5d3] bg-[#fff8f8] text-[#8f5550]"
                    : "border-[var(--line)] bg-[var(--background)]"
                } ${isSelected ? "border-[var(--leaf)] bg-[var(--mint)] shadow-[inset_0_0_0_1px_var(--leaf)]" : ""}`}
                key={variant.id}
              >
                <input
                  checked={isSelected}
                  className="sr-only"
                  disabled={!variantIsActive}
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
                {!variantIsActive ? (
                  <span className="mt-1 block text-xs font-semibold text-[var(--coral)]">Coming soon</span>
                ) : variantIsOut ? (
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
        <div className="mt-1 text-lg font-semibold sm:text-xl">
          <PriceWithCompare
            compareAtPrice={compareAtForVariant}
            currency={product.currency}
            value={selectedVariant.price}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--mint)]/45 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Quantity</p>
          <div className="mt-2">
            {selectedVariantCanPurchase ? (
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
                {selectedVariantIsActive ? "Out of stock" : "Coming soon"}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total</p>
          <div className="mt-1 text-lg font-semibold sm:text-xl">
            <PriceWithCompare
              compareAtPrice={compareAtForVariant ? compareAtForVariant * effectiveQuantity : undefined}
              currency={product.currency}
              showSavingsPill={false}
              value={selectedVariant.price * effectiveQuantity}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-[var(--leaf-deep)] p-1.5">
        <Button
          className="w-full rounded-[10px] border border-transparent bg-[var(--leaf-deep)] text-base font-bold tracking-wide text-white hover:bg-[var(--leaf)]"
          disabled={!selectedVariantCanPurchase || !hasAnyInStockVariant}
          type="button"
          onClick={addToCart}
        >
          {selectedVariantCanPurchase ? "Add to Cart" : selectedVariantIsActive ? "Out of Stock" : "Coming Soon"}
        </Button>
      </div>
      <p className="mt-2 min-h-5 text-xs font-medium text-[var(--muted)]" aria-live="polite">
        {!selectedVariantIsActive
          ? "This pack is coming soon."
          : isOutOfStock
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
