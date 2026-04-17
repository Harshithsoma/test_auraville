"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/types/product";
import { Price } from "@/components/ui/price";
import { useCartStore } from "@/stores/cart-store";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const isAvailable = product.availability === "available";
  const [didAdd, setDidAdd] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const variant = product.variants[0];

  function addProduct() {
    if (!isAvailable || !variant) return;

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      variantId: variant.id,
      variantLabel: variant.label,
      unitPrice: variant.price,
      quantity: 1
    });
    setDidAdd(true);
    window.setTimeout(() => setDidAdd(false), 900);
  }

  return (
    <article className="group overflow-hidden rounded-lg border border-[var(--line)] bg-white transition active:scale-[0.99] sm:hover:-translate-y-1 sm:hover:shadow-xl sm:hover:shadow-[#17211c1a]">
      <Link className="focus-ring block rounded-lg" href={`/product/${product.slug}`}>
        <div className="relative aspect-[4/4.2] overflow-hidden bg-[var(--mint)]">
          <Image
            alt={product.name}
            className="object-cover transition duration-500 group-hover:scale-105"
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            src={product.image}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-[var(--leaf-deep)]">
              {isAvailable ? "Available Now" : product.releaseNote ?? "Coming soon"}
            </span>
          </div>
        </div>
      </Link>
      <div className="p-3.5">
        <Link className="focus-ring block rounded-lg" href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 sm:text-base">{product.name}</h3>
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span>{variant?.label ?? "Pack"}</span>
          <span aria-label={`${product.rating.toFixed(1)} star rating`}>★ {product.rating.toFixed(1)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold sm:text-base">
            {isAvailable ? <Price currency={product.currency} value={product.price} /> : "Soon"}
          </p>
          <button
            aria-label={isAvailable ? `Add ${product.name} to cart` : `${product.name} coming soon`}
            className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border transition active:scale-90 ${
              didAdd
                ? "border-[var(--leaf)] bg-[var(--leaf)] text-white"
                : "border-[var(--line)] bg-[var(--mint)] text-[var(--leaf-deep)] hover:border-[var(--leaf)]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={!isAvailable}
            type="button"
            onClick={addProduct}
          >
            {didAdd ? (
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="m6 12 4 4 8-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
