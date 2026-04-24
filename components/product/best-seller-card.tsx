"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { PriceWithCompare } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { useCartStore } from "@/stores/cart-store";

export function BestSellerCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const isAvailable = product.availability === "available";
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const variant = product.variants[0];
  const cartItem = variant
    ? items.find((item) => item.productId === product.id && item.variantId === variant.id)
    : undefined;
  const quantity = cartItem?.quantity ?? 0;

  function addToCart(openCart = false) {
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
    if (openCart) {
      openDrawer();
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <Link className="focus-ring block rounded-lg" href={`/product/${product.slug}`}>
        <div className="relative aspect-[4/4.2] overflow-hidden bg-[var(--mint)]">
          <Image
            alt={product.name}
            className="object-cover"
            fill
            priority={priority}
            sizes="(min-width: 1280px) 21vw, (min-width: 768px) 28vw, (min-width: 480px) 46vw, 90vw"
            src={product.image}
          />
          <span className="absolute left-2 top-2 rounded-md bg-[#1f2421] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#f4f1de]">
            {product.badgeLabel ?? "Best Seller"}
          </span>
        </div>
      </Link>

      <div className="px-3 pb-3 pt-3.5">
        <Link className="focus-ring block rounded-lg" href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{product.name}</h3>
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--muted)] sm:text-xs">
          <span>{variant?.label ?? "Pack"}</span>
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        </div>
        <div className="mt-2 text-sm">
          <PriceWithCompare compareAtPrice={product.compareAtPrice} currency={product.currency} value={product.price} />
        </div>

        {isAvailable ? (
          quantity === 0 ? (
            <button
              className="focus-ring mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--leaf)] bg-[var(--leaf)] px-3 text-sm font-semibold text-white transition active:scale-95"
              type="button"
              onClick={() => addToCart(true)}
            >
              Add to Cart
            </button>
          ) : (
            <div className="mt-3 inline-flex h-10 w-full items-center justify-between rounded-lg border border-[var(--line)]">
              <button
                aria-label={`Decrease ${product.name} quantity`}
                className="focus-ring h-full w-10 rounded-l-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                type="button"
                onClick={() => {
                  if (!variant) return;
                  if (quantity === 1) {
                    removeItem(product.id, variant.id);
                    return;
                  }
                  updateQuantity(product.id, variant.id, quantity - 1);
                }}
              >
                -
              </button>
              <span className="text-sm font-bold" aria-live="polite">
                {quantity}
              </span>
              <button
                aria-label={`Increase ${product.name} quantity`}
                className="focus-ring h-full w-10 rounded-r-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                type="button"
                onClick={() => addToCart(true)}
              >
                +
              </button>
            </div>
          )
        ) : (
          <Link
            className="focus-ring mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 text-sm font-semibold text-[var(--leaf-deep)]"
            href={`/product/${product.slug}`}
          >
            Notify Me
          </Link>
        )}
      </div>
    </article>
  );
}
