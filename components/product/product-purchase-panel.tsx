"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Price, PriceWithCompare } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const isAvailable = product.availability === "available";
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.id === variantId) ?? product.variants[0],
    [product.variants, variantId]
  );

  const compareAtForVariant = useMemo(() => {
    if (!selectedVariant) return undefined;
    if (!product.compareAtPrice || product.compareAtPrice <= product.price) return undefined;
    const ratio = product.compareAtPrice / product.price;
    return Math.round(selectedVariant.price * ratio);
  }, [product.compareAtPrice, product.price, selectedVariant]);

  if (!selectedVariant) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_18px_45px_rgb(23_33_28_/_8%)] sm:p-5">
        <p className="text-sm text-[var(--muted)]">Variants will be listed here shortly.</p>
      </div>
    );
  }

  function addToCart() {
    if (!isAvailable) {
      setStatus(`${product.name} is coming soon.`);
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
      quantity
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
          {product.variants.map((variant) => (
            <label
              className="cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--background)] p-3.5 transition has-[:checked]:border-[var(--leaf)] has-[:checked]:bg-[var(--mint)] has-[:checked]:shadow-[inset_0_0_0_1px_var(--leaf)]"
              key={variant.id}
            >
              <input
                checked={variantId === variant.id}
                className="sr-only"
                disabled={!isAvailable}
                name="variant"
                type="radio"
                value={variant.id}
                onChange={() => setVariantId(variant.id)}
              />
              <span className="block text-sm font-semibold text-[var(--foreground)]">{variant.label}</span>
              <span className="mt-1 block text-xs text-[var(--muted)]">{variant.unit}</span>
              <span className="mt-2 block text-sm font-semibold text-[var(--leaf-deep)]">
                <Price currency={product.currency} value={variant.price} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--mint)]/45 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Quantity</p>
          <div className="mt-2">
            {isAvailable ? (
              <QuantityStepper value={quantity} onChange={setQuantity} />
            ) : (
              <span className="inline-flex h-11 items-center rounded-lg border border-[var(--line)] bg-[var(--mint)] px-4 text-sm font-semibold text-[var(--leaf-deep)]">
                Launching soon
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total</p>
          {isAvailable ? (
            <div className="mt-1 text-lg font-semibold sm:text-xl">
              <PriceWithCompare
                compareAtPrice={compareAtForVariant ? compareAtForVariant * quantity : undefined}
                currency={product.currency}
                showSavingsPill={false}
                value={selectedVariant.price * quantity}
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
          disabled={!isAvailable}
          type="button"
          onClick={addToCart}
        >
          {isAvailable ? "Add to Cart" : "Coming Soon"}
        </Button>
      </div>
      <p className="mt-3 min-h-6 text-sm font-semibold text-[var(--leaf-deep)]" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
