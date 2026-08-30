"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { selectDefaultProductVariant } from "@/components/product/card-variant";
import { getProductAvailabilityState } from "@/lib/product-lifecycle";

export function ProductDetailAsideClient({ product }: { product: Product }) {
  const defaultVariant = useMemo(() => selectDefaultProductVariant(product.variants), [product.variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");
  const productAvailabilityState = getProductAvailabilityState(product);

  return (
    <section className="lg:sticky lg:top-24 lg:h-fit" aria-labelledby="product-title">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_22px_65px_rgb(23_33_28_/_8%)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--coral)]">{product.category}</p>
        <h1 id="product-title" className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--ink-soft)] sm:text-lg">{product.tagline}</p>

        <ProductPurchasePanel
          product={product}
          selectedVariantId={selectedVariantId}
          onSelectedVariantIdChange={setSelectedVariantId}
        />

        {product.ingredients.length > 0 || product.benefits.length > 0 ? (
          <div className="mt-6 grid gap-3 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
            {product.ingredients.length > 0 ? (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--mint)]/35 p-3.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ingredients</h2>
                <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {product.benefits.length > 0 ? (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--mint)]/35 p-3.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Benefits</h2>
                <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
                  {product.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {productAvailabilityState === "coming-soon" ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Recipe in development. Final price and pack sizes may change before launch.
          </p>
        ) : productAvailabilityState === "out-of-stock" ? (
          <p className="mt-4 text-sm font-semibold text-[var(--coral)]">
            All active variants are currently out of stock.
          </p>
        ) : null}
      </div>
    </section>
  );
}
