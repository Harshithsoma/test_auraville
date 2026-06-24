"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { PriceWithCompare } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { useCartStore } from "@/stores/cart-store";
import { selectContextDisplayVariant } from "@/components/product/card-variant";
import { useNotifyMe } from "@/hooks/use-notify-me";

export function BestSellerCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const isAvailable = product.availability === "available";
  const [status, setStatus] = useState("");
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const getAvailableStock = useCartStore((state) => state.getAvailableStock);
  const pushCartNotice = useCartStore((state) => state.pushCartNotice);

  const { variant, isOutOfStock, compareAtPrice } = selectContextDisplayVariant(product, "bestSeller");
  const { notify, isSubmitting: isNotifySubmitting } = useNotifyMe({
    onSuccess: (message) => setStatus(message),
    onError: (message) => setStatus(message)
  });
  const cartItem = variant
    ? items.find((item) => item.productId === product.id && item.variantId === variant.id)
    : undefined;
  const quantity = cartItem?.quantity ?? 0;
  const displayPrice = variant?.price ?? product.price;
  const availableStock = variant ? getAvailableStock(product.id, variant.id) ?? variant.stock ?? null : null;
  const canPurchase = isAvailable && Boolean(variant) && !isOutOfStock;
  const marketingBadge = product.badgeLabel?.trim() ?? "";
  const badgeText = !isAvailable ? "Coming Soon" : !canPurchase ? "Out of Stock" : marketingBadge || null;

  function addToCart(openCart = false) {
    if (!isAvailable || !variant) return;
    if (isOutOfStock) {
      pushCartNotice("No more quantity available.");
      return;
    }
    if (typeof availableStock === "number" && availableStock <= 0) {
      pushCartNotice("No more quantity available.");
      return;
    }
    if (typeof availableStock === "number" && quantity + 1 > availableStock) {
      pushCartNotice(availableStock === 1 ? "Only 1 left in stock." : `Only ${availableStock} left in stock.`);
      return;
    }
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
    <article className="flex h-[430px] flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-white transition active:scale-[0.99] sm:h-[440px] md:h-full md:min-h-0">
      <Link className="focus-ring block rounded-lg transition active:opacity-90" href={`/product/${product.slug}`}>
        <div className="relative aspect-[4/4.2] overflow-hidden bg-[var(--mint)]">
          <Image
            alt={product.name}
            className="object-cover"
            fill
            priority={priority}
            sizes="(min-width: 1280px) 21vw, (min-width: 768px) 28vw, (min-width: 480px) 46vw, 90vw"
            src={product.image}
          />
          {badgeText ? (
            <span className="absolute left-2 top-2 rounded-md bg-[#1f2421] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#f4f1de]">
              {badgeText}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2.5 sm:px-3 sm:pb-3 sm:pt-3.5">
        <Link className="focus-ring block rounded-lg transition active:opacity-90" href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-xs font-semibold leading-5 sm:text-sm">{product.name}</h3>
        </Link>
        <div className="mt-1.5 flex min-h-[38px] flex-col items-start gap-1 text-[11px] text-[var(--muted)] sm:mt-2 sm:min-h-5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:text-xs">
          <span className="line-clamp-1 max-w-full">{variant?.label ?? "Pack"}</span>
          <div className="shrink-0 scale-[0.92] origin-left sm:scale-100">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          </div>
        </div>
        <div className="mt-1.5 min-h-[50px] text-[13px] sm:mt-2 sm:min-h-[44px] sm:text-sm">
          {canPurchase ? (
            <PriceWithCompare compareAtPrice={compareAtPrice} currency={product.currency} value={displayPrice} />
          ) : (
            <p className="font-bold">{isAvailable ? "Out of Stock" : "Coming Soon"}</p>
          )}
        </div>
        <div className="mt-0.5 min-h-4 sm:mt-1">
          {canPurchase && typeof availableStock === "number" && availableStock > 0 && availableStock <= 5 ? (
            <p className="text-[11px] font-semibold text-[var(--coral)]">
              {availableStock === 1 ? "Only 1 left" : `Only ${availableStock} left`}
            </p>
          ) : null}
        </div>

        <div className="mt-auto">
          {canPurchase ? (
            quantity === 0 ? (
              <button
                className="focus-ring mt-2.5 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--leaf)] bg-[var(--leaf)] px-3 text-xs font-semibold text-white transition active:scale-95 sm:mt-3 sm:h-10 sm:text-sm"
                type="button"
                onClick={() => addToCart(true)}
              >
                Add to Cart
              </button>
            ) : (
              <div className="mt-2.5 inline-flex h-9 w-full items-center justify-between rounded-lg border border-[var(--line)] sm:mt-3 sm:h-10">
                <button
                  aria-label={`Decrease ${product.name} quantity`}
                  className="focus-ring h-full w-10 rounded-l-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                  type="button"
                  onClick={() => {
                    if (!variant) return;
                    if (quantity === 1) {
                      removeItem(product.id, variant.id);
                      openDrawer();
                      return;
                    }
                    updateQuantity(product.id, variant.id, quantity - 1);
                    openDrawer();
                  }}
                >
                  -
                </button>
                <span className="text-xs font-bold sm:text-sm" aria-live="polite">
                  {quantity}
                </span>
                <button
                  aria-label={`Increase ${product.name} quantity`}
                  className="focus-ring h-full w-10 rounded-r-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={typeof availableStock === "number" && quantity >= availableStock}
                  onClick={() => addToCart(true)}
                >
                  +
                </button>
              </div>
            )
          ) : (
            <button
              className="focus-ring mt-2.5 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 text-xs font-semibold text-[var(--leaf-deep)] sm:mt-3 sm:h-10 sm:text-sm"
              type="button"
              disabled={isNotifySubmitting}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void notify({ id: product.id, slug: product.slug });
              }}
            >
              {isNotifySubmitting ? "Saving..." : "Notify Me"}
            </button>
          )}
          <div className="mt-2 min-h-4">
            {status ? (
              <p className="text-[11px] font-medium text-[var(--leaf-deep)]" aria-live="polite">
                {status}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
