"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { PriceWithCompare } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { RatingStars } from "@/components/ui/rating-stars";
import { ProductVariantChips } from "@/components/product/product-variant-chips";
import { getVariantCompareAtPrice, selectDefaultProductVariant, sortVariantsLogically } from "@/components/product/card-variant";
import { isVariantActive, isVariantPurchasable } from "@/lib/product-lifecycle";

type ProductPurchasePanelProps = {
  product: Product;
  selectedVariantId?: string;
  onSelectedVariantIdChange?: (variantId: string) => void;
};

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
  const effectiveVariantId = isControlled ? selectedVariantId : internalVariantId || defaultVariant?.id || "";

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    const selectedCandidate = sortedVariants.find((variant) => variant.id === selectedVariantId);
    const shouldUseDefault =
      !selectedCandidate || (!isVariantPurchasable(selectedCandidate) && isVariantPurchasable(defaultVariant));
    if (shouldUseDefault && defaultVariant) {
      onSelectedVariantIdChange(defaultVariant.id);
    }
  }, [defaultVariant, isControlled, onSelectedVariantIdChange, selectedVariantId, sortedVariants]);

  const selectedVariant = useMemo(() => {
    const byId = sortedVariants.find((variant) => variant.id === effectiveVariantId);
    return byId ?? defaultVariant ?? null;
  }, [defaultVariant, effectiveVariantId, sortedVariants]);

  const selectedVariantStock = selectedVariant
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
  const availabilityLabel = !selectedVariantIsActive
    ? "Coming Soon"
    : isOutOfStock
      ? "Sold Out"
      : "Available Now";

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
      <div className="mt-5 border-t border-[var(--line)] pt-5">
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
        selectedVariantStock === 1 ? "Only 1 left in stock." : `Only ${selectedVariantStock} left in stock.`;
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
    <div className="mt-4 flex flex-col border-t border-[var(--line)] pt-4 lg:mt-5 lg:pt-5">
      <div className="order-1 lg:order-2 lg:mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Price</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="text-2xl sm:text-3xl">
            <PriceWithCompare
              compareAtPrice={compareAtForVariant}
              currency={product.currency}
              value={selectedVariant.price}
            />
          </div>
          <span
            className={`hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide lg:inline-flex ${selectedVariantCanPurchase
              ? "bg-[var(--mint)] text-[var(--leaf-deep)]"
              : "bg-[#fff2f0] text-[#9b5a50]"}`}
          >
            {availabilityLabel}
          </span>
        </div>
        {product.reviewCount > 0 ? (
          <div className="mt-2 hidden lg:block">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          </div>
        ) : null}
      </div>

      <div className="order-2 mt-4 lg:order-1 lg:mt-0">
        {sortedVariants.length > 1 ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Pack size</p>
            <ProductVariantChips
              getAvailableStock={getAvailableStock}
              productId={product.id}
              productName={product.name}
              selectedVariantId={selectedVariant.id}
              surface="pdp"
              variants={sortedVariants}
              onSelect={setCurrentVariant}
            />
          </>
        ) : null}
        <p className={`${sortedVariants.length > 1 ? "mt-2" : ""} text-sm text-[var(--muted)]`}>
          Selected: <span className="font-semibold text-[var(--foreground)]">{selectedVariant.label}</span>
          {selectedVariantCanPurchase &&
          typeof selectedVariantStock === "number" &&
          selectedVariantStock > 0 &&
          selectedVariantStock <= 5 ? (
            <span className="ml-2 font-semibold text-[var(--coral)]">
              {selectedVariantStock === 1 ? "Only 1 left" : `Only ${selectedVariantStock} left`}
            </span>
          ) : !selectedVariantCanPurchase ? (
            <span className="ml-2 font-semibold text-[var(--coral)]">{availabilityLabel}</span>
          ) : null}
        </p>
      </div>

      <div className="order-3 mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2.5 lg:mt-5 lg:gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Quantity</p>
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
              <span className="inline-flex h-11 items-center rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 text-xs font-semibold text-[var(--leaf-deep)]">
                {selectedVariantIsActive ? "Sold Out" : "Coming Soon"}
              </span>
            )}
          </div>
        </div>
        <Button
          className="h-11 w-full px-3 py-2.5 text-sm font-bold tracking-wide sm:text-base"
          disabled={!selectedVariantCanPurchase || !hasAnyInStockVariant}
          type="button"
          onClick={addToCart}
        >
          {selectedVariantCanPurchase ? "Add to Cart" : selectedVariantIsActive ? "Sold Out" : "Coming Soon"}
        </Button>
      </div>

      {status ? (
        <p
          className="order-4 mt-3 text-sm font-semibold text-[var(--leaf-deep)]"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}

      <p className="order-5 mt-5 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
        {product.longDescription}
      </p>

      {product.reviewCount > 0 ? (
        <div className="order-6 mt-4 lg:hidden">
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        </div>
      ) : null}
    </div>
  );
}
