"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { PriceWithCompare } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { getVariantCompareAtPrice, selectDefaultProductVariant } from "@/components/product/card-variant";

export function ProductDetailAsideClient({ product }: { product: Product }) {
  const defaultVariant = useMemo(() => selectDefaultProductVariant(product.variants), [product.variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");
  const isAvailable = product.availability === "available";

  const selectedVariant = useMemo(() => {
    const byId = product.variants.find((variant) => variant.id === selectedVariantId);
    return byId ?? defaultVariant ?? null;
  }, [defaultVariant, product.variants, selectedVariantId]);

  const compareAtForVariant = selectedVariant ? getVariantCompareAtPrice(product, selectedVariant) : undefined;
  const selectedIsOutOfStock = (selectedVariant?.stock ?? 0) <= 0;
  const hasAnyStock = product.variants.some((variant) => (variant.stock ?? 0) > 0);
  const variantAvailabilityLabel = !selectedVariant
    ? "Unavailable"
    : selectedIsOutOfStock
      ? "Out of stock"
      : "Available now";

  return (
    <section className="space-y-5 lg:sticky lg:top-24 lg:h-fit" aria-labelledby="product-title">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_22px_65px_rgb(23_33_28_/_8%)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--coral)]">{product.category}</p>
        <h1 id="product-title" className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          {product.name}
        </h1>
        <p className="mt-3 text-base text-[var(--ink-soft)] sm:text-lg">{product.tagline}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="text-xl sm:text-2xl">
            {isAvailable && selectedVariant ? (
              <PriceWithCompare
                compareAtPrice={compareAtForVariant}
                currency={product.currency}
                value={selectedVariant.price}
              />
            ) : isAvailable ? (
              <p className="font-semibold">Unavailable</p>
            ) : (
              <p className="font-semibold">Coming soon</p>
            )}
          </div>
          <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--leaf-deep)]">
            {isAvailable
              ? selectedVariant
                ? variantAvailabilityLabel
                : "Unavailable"
              : product.releaseNote ?? "Coming soon"}
          </span>
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        </div>
        {selectedVariant ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Selected: <span className="font-semibold text-[var(--foreground)]">{selectedVariant.label}</span>
            {(selectedVariant.stock ?? 0) > 0 && (selectedVariant.stock ?? 0) <= 5 ? (
              <span className="ml-2 font-semibold text-[var(--coral)]">
                {(selectedVariant.stock ?? 0) === 1
                  ? "Only 1 left"
                  : `Only ${selectedVariant.stock ?? 0} left`}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--mint)]/35 p-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ingredients</h2>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
              {product.ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--mint)]/35 p-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Benefits</h2>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
              {product.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-[var(--muted)] sm:text-base">{product.longDescription}</p>

        {!isAvailable ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Recipe in development. Final price and pack sizes may change before launch.
          </p>
        ) : !hasAnyStock ? (
          <p className="mt-4 text-sm font-semibold text-[var(--coral)]">
            All active variants are currently out of stock.
          </p>
        ) : null}
      </div>

      <div>
        <ProductPurchasePanel
          product={product}
          selectedVariantId={selectedVariant?.id ?? selectedVariantId}
          onSelectedVariantIdChange={setSelectedVariantId}
        />
      </div>
    </section>
  );
}
