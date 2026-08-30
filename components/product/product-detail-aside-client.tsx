"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { selectDefaultProductVariant } from "@/components/product/card-variant";
import { RatingStars } from "@/components/ui/rating-stars";
import { getProductAvailabilityState } from "@/lib/product-lifecycle";

function ProductBenefitStrip({ benefits }: { benefits: string[] }) {
  const visibleBenefits = benefits.slice(0, 4);
  const columnClass =
    visibleBenefits.length >= 4
      ? "grid-cols-4"
      : visibleBenefits.length === 3
        ? "grid-cols-3"
        : visibleBenefits.length === 2
          ? "grid-cols-2"
          : "grid-cols-1";

  if (visibleBenefits.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Product benefits"
      className={`grid ${columnClass} overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)] lg:hidden`}
    >
      {visibleBenefits.map((benefit) => (
        <div
          className="flex min-w-0 flex-col items-center justify-center gap-1.5 bg-[var(--mint)] px-1.5 py-3 text-center"
          key={benefit}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--leaf-deep)]">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path
                d="m6.5 12.5 3.25 3.25L17.5 8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </span>
          <span className="text-[10px] font-semibold leading-3.5 text-[var(--leaf-deep)]">{benefit}</span>
        </div>
      ))}
    </section>
  );
}

export function ProductDetailAsideClient({ product }: { product: Product }) {
  const defaultVariant = useMemo(() => selectDefaultProductVariant(product.variants), [product.variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");
  const productAvailabilityState = getProductAvailabilityState(product);

  return (
    <section className="lg:sticky lg:top-24 lg:h-fit" aria-labelledby="product-title">
      <div className="space-y-3 lg:space-y-0 lg:rounded-2xl lg:border lg:border-[var(--line)] lg:bg-white lg:p-6 lg:shadow-[0_22px_65px_rgb(23_33_28_/_8%)]">
        <div className="px-1 py-0.5 lg:p-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--coral)] lg:text-xs">
            {product.category}
          </p>
          <h1 id="product-title" className="mt-1 text-2xl font-semibold leading-8 lg:mt-2 lg:text-4xl lg:leading-tight">
            {product.name}
          </h1>
          <p className="mt-1 text-sm leading-5 text-[var(--ink-soft)] lg:mt-3 lg:text-lg lg:leading-7">
            {product.tagline}
          </p>
        </div>

        <ProductPurchasePanel
          product={product}
          selectedVariantId={selectedVariantId}
          onSelectedVariantIdChange={setSelectedVariantId}
        />

        <ProductBenefitStrip benefits={product.benefits} />

        {product.ingredients.length > 0 || product.benefits.length > 0 ? (
          <div className="grid gap-3 lg:mt-6 lg:grid-cols-2 lg:border-t lg:border-[var(--line)] lg:pt-6">
            {product.ingredients.length > 0 ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-4 lg:bg-[var(--mint)]/35 lg:p-3.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ingredients</h2>
                <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {product.benefits.length > 0 ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-4 lg:bg-[var(--mint)]/35 lg:p-3.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Benefits</h2>
                <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
                  {product.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {product.reviewCount > 0 ? (
          <section className="rounded-xl border border-[var(--line)] bg-white p-4 lg:hidden" aria-label="Product rating">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Customer rating</h2>
            <div className="mt-2.5">
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
            </div>
          </section>
        ) : null}

        {productAvailabilityState === "coming-soon" ? (
          <p className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)] lg:mt-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            Recipe in development. Final price and pack sizes may change before launch.
          </p>
        ) : productAvailabilityState === "out-of-stock" ? (
          <p className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm font-semibold text-[var(--coral)] lg:mt-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            All active variants are currently out of stock.
          </p>
        ) : null}
      </div>
    </section>
  );
}
