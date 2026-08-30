"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { PriceWithCompare } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { useCartStore } from "@/stores/cart-store";
import {
  getVariantCompareAtPrice,
  selectCardDisplayVariant,
  selectContextDisplayVariant,
  sortVariantsLogically
} from "@/components/product/card-variant";
import { ProductVariantChips } from "@/components/product/product-variant-chips";
import { isVariantActive } from "@/lib/product-lifecycle";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
  variantContext?: "default" | "featured" | "bestSeller" | "comingSoon";
  layout?: "grid" | "carousel";
};

export function ProductCard({
  product,
  priority = false,
  variantContext = "default",
  layout = "grid"
}: ProductCardProps) {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const getAvailableStock = useCartStore((state) => state.getAvailableStock);
  const pushCartNotice = useCartStore((state) => state.pushCartNotice);
  const sortedVariants = useMemo(() => sortVariantsLogically(product.variants), [product.variants]);
  const initialSelection =
    variantContext === "default"
      ? selectCardDisplayVariant(product)
      : selectContextDisplayVariant(product, variantContext);
  const [selectedVariantId, setSelectedVariantId] = useState(initialSelection.variant?.id ?? "");

  const variant = useMemo(
    () => sortedVariants.find((candidate) => candidate.id === selectedVariantId) ?? initialSelection.variant,
    [initialSelection.variant, selectedVariantId, sortedVariants]
  );
  const compareAtPrice = variant ? getVariantCompareAtPrice(product, variant) : undefined;
  const cartItem = variant
    ? items.find((item) => item.productId === product.id && item.variantId === variant.id)
    : undefined;
  const quantity = cartItem?.quantity ?? 0;
  const displayPrice = variant?.price ?? product.price;
  const availableStock = variant ? getAvailableStock(product.id, variant.id) ?? variant.stock ?? null : null;
  const variantIsActive = isVariantActive(variant);
  const canPurchase = variant ? variantIsActive && (availableStock ?? variant.stock ?? 0) > 0 : false;
  const marketingBadge = product.badgeLabel?.trim() ?? "";
  const badgeText = !variantIsActive ? "Coming Soon" : !canPurchase ? "Out of Stock" : marketingBadge || null;
  const secondaryImage = product.gallery.find((media) => media && media !== product.image);
  const hasMultipleVariants = sortedVariants.length > 1;

  function addToCart(openCart = false) {
    if (!variant || !variantIsActive) return;
    if (!canPurchase) {
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

  function decreaseQuantity() {
    if (!variant || quantity === 0) return;
    if (quantity === 1) {
      removeItem(product.id, variant.id);
      openDrawer();
      return;
    }
    updateQuantity(product.id, variant.id, quantity - 1);
    openDrawer();
  }

  function increaseQuantity() {
    if (!variant) return;
    if (typeof availableStock === "number" && quantity >= availableStock) {
      pushCartNotice(availableStock === 1 ? "Only 1 left in stock." : `Only ${availableStock} left in stock.`);
      return;
    }
    addToCart(true);
  }

  return (
    <article
      className={[
        "flex flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-white transition active:scale-[0.99]",
        layout === "carousel" ? "h-full" : "h-full min-h-0"
      ].join(" ")}
    >
      <Link className="focus-ring group block rounded-lg transition active:opacity-90" href={`/product/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-[var(--mint)]">
          <Image
            alt={product.name}
            className={`object-cover transition duration-500 ease-out ${secondaryImage ? "" : "md:group-hover:scale-[1.035]"}`}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            src={product.image}
          />
          {secondaryImage ? (
            <Image
              alt=""
              aria-hidden="true"
              className="hidden object-cover opacity-0 transition-opacity duration-500 ease-out md:block md:group-hover:opacity-100"
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              src={secondaryImage}
            />
          ) : null}
          {badgeText ? (
            <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--leaf-deep)]">
              {badgeText}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex min-h-0 flex-1 flex-col border-t border-[var(--line)] px-2.5 pb-2.5 pt-2.5 sm:px-3 sm:pb-3 sm:pt-3">
        <Link className="focus-ring block rounded-lg transition active:opacity-90" href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-xs font-bold leading-5 sm:text-sm">{product.name}</h3>
        </Link>

        <div className="mt-1.5 flex min-h-5 items-center justify-between gap-2 text-[11px] text-[var(--muted)] sm:mt-2 sm:text-xs">
          <span className="line-clamp-1 min-w-0">{hasMultipleVariants ? "Pack size" : variant?.label ?? "Pack"}</span>
          {product.reviewCount > 0 ? (
            <div className="shrink-0 origin-right scale-[0.86] sm:scale-90">
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
            </div>
          ) : null}
        </div>

        <ProductVariantChips
          getAvailableStock={getAvailableStock}
          productId={product.id}
          productName={product.name}
          selectedVariantId={variant?.id ?? selectedVariantId}
          variants={sortedVariants}
          onSelect={setSelectedVariantId}
        />

        <div className="mt-2.5 text-[13px] sm:mt-3 sm:text-base">
          {canPurchase ? (
            <PriceWithCompare compareAtPrice={compareAtPrice} currency={product.currency} value={displayPrice} />
          ) : (
            <p className="font-bold">{!variantIsActive ? "Coming Soon" : "Out of Stock"}</p>
          )}
        </div>

        <div className="mt-1 min-h-4">
          {canPurchase && typeof availableStock === "number" && availableStock > 0 && availableStock <= 5 ? (
            <p className="text-[11px] font-semibold text-[var(--coral)]">
              {availableStock === 1 ? "Only 1 left" : `Only ${availableStock} left`}
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-2">
          {canPurchase ? (
            quantity === 0 ? (
              <button
                className="focus-ring inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--leaf)] bg-[var(--leaf)] px-3 text-xs font-semibold text-white transition active:scale-95 sm:h-10 sm:text-sm"
                type="button"
                onClick={() => addToCart(true)}
              >
                Add to Cart
              </button>
            ) : (
              <div className="inline-flex h-9 w-full items-center justify-between rounded-lg border border-[var(--line)] sm:h-10">
                <button
                  aria-label={`Decrease ${product.name} quantity`}
                  className="focus-ring h-full w-10 rounded-l-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                  type="button"
                  onClick={decreaseQuantity}
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
                  onClick={increaseQuantity}
                >
                  +
                </button>
              </div>
            )
          ) : (
            <button
              className="focus-ring inline-flex h-9 w-full cursor-not-allowed items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 text-xs font-semibold text-[var(--leaf-deep)] sm:h-10 sm:text-sm"
              type="button"
              disabled
            >
              {!variantIsActive ? "Coming Soon" : "Out of Stock"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
