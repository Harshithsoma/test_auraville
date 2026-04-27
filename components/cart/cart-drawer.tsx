"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCompareAtUnitPrice } from "@/lib/products";
import { useAuthStore } from "@/stores/auth-store";
import { getCartCount, useCartStore } from "@/stores/cart-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { formatPrice } from "@/components/ui/price";

const freeShippingThreshold = 499;

export function CartDrawer() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);

  const items = useCartStore((state) => state.items);
  const isDrawerOpen = useCartStore((state) => state.isDrawerOpen);
  const cartNotice = useCartStore((state) => state.cartNotice);
  const cartNoticeKey = useCartStore((state) => state.cartNoticeKey);
  const cartNoticePending = useCartStore((state) => state.cartNoticePending);
  const promoCode = useCartStore((state) => state.promoCode);
  const promoDiscountPercent = useCartStore((state) => state.promoDiscountPercent);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const applyPromoCode = useCartStore((state) => state.applyPromoCode);
  const clearPromoCode = useCartStore((state) => state.clearPromoCode);
  const consumeCartNotice = useCartStore((state) => state.consumeCartNotice);

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  const enrichedItems = useMemo(
    () =>
      items.map((item) => {
        const compareAtUnitPrice = getCompareAtUnitPrice(item.productId, item.unitPrice);
        const currentTotal = item.unitPrice * item.quantity;
        const compareAtTotal = compareAtUnitPrice * item.quantity;
        return {
          ...item,
          compareAtUnitPrice,
          currentTotal,
          compareAtTotal,
          lineSavings: Math.max(0, compareAtTotal - currentTotal)
        };
      }),
    [items]
  );

  const count = getCartCount(items);
  const subtotal = enrichedItems.reduce((sum, item) => sum + item.currentTotal, 0);
  const originalSubtotal = enrichedItems.reduce((sum, item) => sum + item.compareAtTotal, 0);
  const baseSavings = Math.max(0, originalSubtotal - subtotal);
  const promoDiscount = Math.round((subtotal * promoDiscountPercent) / 100);
  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  const shipping = discountedSubtotal >= freeShippingThreshold || discountedSubtotal === 0 ? 0 : 49;
  const finalTotal = discountedSubtotal + shipping;
  const totalSavings = baseSavings + promoDiscount;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - discountedSubtotal);
  const shippingProgress = Math.min(100, Math.round((discountedSubtotal / freeShippingThreshold) * 100));

  useEffect(() => {
    if (!hasMounted || !isDrawerOpen) return;

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEscape);
    };
  }, [closeDrawer, hasMounted, isDrawerOpen]);

  if (!hasMounted) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[130] transition ${isDrawerOpen ? "visible" : "invisible"}`}
      aria-hidden={!isDrawerOpen}
    >
      <button
        aria-label="Close cart drawer"
        className={`absolute inset-0 bg-black/35 transition ${isDrawerOpen ? "pointer-events-auto opacity-100" : "opacity-0"}`}
        type="button"
        onClick={closeDrawer}
      />

      <aside
        aria-label="Cart drawer"
        className={`absolute right-0 top-0 flex h-dvh w-full max-w-[430px] flex-col border-l border-[var(--line)] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isDrawerOpen ? "pointer-events-auto translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="relative border-b border-[var(--line)]">
          <div className="flex items-center justify-between px-4 py-4 sm:px-5">
            <p className="text-sm font-bold uppercase tracking-wide">Your Cart ({count})</p>
            <button
              aria-label="Close cart"
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-lg transition active:scale-95"
              type="button"
              onClick={closeDrawer}
            >
              ×
            </button>
          </div>
          <div className="bg-[var(--leaf)] px-4 py-2 text-center text-xs font-semibold text-white sm:px-5">
            Free shipping above {formatPrice(freeShippingThreshold)}
          </div>
          {isDrawerOpen && cartNoticePending && cartNotice && cartNoticeKey > 0 ? (
            <div
              className="pointer-events-none absolute left-1/2 top-[3.25rem] z-10 -translate-x-1/2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold shadow-md"
              key={cartNoticeKey}
              onAnimationEnd={consumeCartNotice}
              style={{ animation: "toastPulse 2.2s ease both" }}
            >
              {cartNotice}
            </div>
          ) : null}
        </div>

        <div className="border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold">
            <p className="text-[var(--leaf-deep)]">
              {remainingForFreeShipping === 0
                ? "Free shipping unlocked"
                : `Add ${formatPrice(remainingForFreeShipping)} more for free shipping`}
            </p>
            {remainingForFreeShipping === 0 ? (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--leaf)] text-white">✓</span>
            ) : null}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-[var(--leaf)] transition-all duration-500" style={{ width: `${shippingProgress}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {enrichedItems.length === 0 ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] px-4 py-7 text-center">
              <p className="text-base font-semibold">Your cart is empty</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Add products from our best sellers to continue.</p>
              <Link
                className="focus-ring mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-[var(--leaf)] bg-[var(--leaf)] px-4 text-sm font-semibold text-white transition active:scale-95"
                href="/#best-sellers-title"
                onClick={closeDrawer}
              >
                Shop Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedItems.map((item) => (
                <article className="rounded-lg border border-[var(--line)] bg-white p-3" key={`${item.productId}-${item.variantId}`}>
                  <div className="grid grid-cols-[74px_1fr] gap-3 sm:grid-cols-[78px_1fr]">
                    <Link
                      className="focus-ring relative aspect-square overflow-hidden rounded-md bg-[var(--mint)]"
                      href={`/product/${item.slug}`}
                      onClick={closeDrawer}
                    >
                      <Image alt={item.name} className="object-cover" fill sizes="(min-width: 640px) 78px, 74px" src={item.image} />
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          className="focus-ring line-clamp-2 rounded text-sm font-semibold leading-5"
                          href={`/product/${item.slug}`}
                          onClick={closeDrawer}
                        >
                          {item.name}
                        </Link>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold">{formatPrice(item.currentTotal)}</p>
                          {item.compareAtTotal > item.currentTotal ? (
                            <p className="text-xs text-[var(--muted)] line-through">{formatPrice(item.compareAtTotal)}</p>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-0.5 text-xs text-[var(--muted)]">{item.variantLabel}</p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex h-9 items-center rounded-lg border border-[var(--line)]">
                          <button
                            aria-label={`Decrease ${item.name}`}
                            className="focus-ring h-full w-9 rounded-l-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                            type="button"
                            onClick={() => {
                              if (item.quantity === 1) {
                                removeItem(item.productId, item.variantId);
                                return;
                              }
                              updateQuantity(item.productId, item.variantId, item.quantity - 1);
                            }}
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center text-xs font-semibold" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            aria-label={`Increase ${item.name}`}
                            className="focus-ring h-full w-9 rounded-r-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>

                        <button
                          aria-label={`Remove ${item.name}`}
                          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7c9c6] bg-[#fff7f7] text-[#b35e5a] transition hover:border-[#dbb3af] hover:bg-[#fdeeed] hover:text-[#a84843] active:scale-95"
                          type="button"
                          onClick={() => removeItem(item.productId, item.variantId)}
                        >
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path
                              d="M4 7h16M9 7V5h6v2m-8 0 1 12h8l1-12M10 11v5m4-5v5"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--line)] px-4 py-4 sm:px-5">
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Promo code</p>
            {promoCode ? (
              <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2">
                <p className="text-sm font-semibold">
                  {promoCode} applied ({promoDiscountPercent}% off)
                </p>
                <button className="focus-ring rounded text-xs font-semibold text-[var(--coral)]" type="button" onClick={clearPromoCode}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  className="focus-ring h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 text-sm"
                  placeholder="Enter promo code"
                  type="text"
                  value={promoInput}
                  onChange={(event) => {
                    setPromoInput(event.target.value);
                    setPromoError("");
                  }}
                />
                <button
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-[var(--leaf)] px-3 text-xs font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                  type="button"
                  onClick={() => {
                    const result = applyPromoCode(promoInput);
                    if (!result.ok) {
                      setPromoError(result.message);
                      return;
                    }
                    setPromoInput("");
                    setPromoError("");
                  }}
                >
                  Apply
                </button>
              </div>
            )}
            {promoError ? <p className="mt-2 text-xs font-semibold text-[var(--coral)]">{promoError}</p> : null}
          </div>

          <button
            aria-expanded={isSummaryOpen}
            className="focus-ring mb-2 flex w-full items-center justify-between rounded-lg py-1 text-sm font-semibold"
            type="button"
            onClick={() => setIsSummaryOpen((current) => !current)}
          >
            <span>Estimated total</span>
            <span className="flex items-center gap-2">
              {formatPrice(finalTotal)}
              <span className={`text-base transition ${isSummaryOpen ? "rotate-180" : ""}`}>⌃</span>
            </span>
          </button>

          {isSummaryOpen ? (
            <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[#f8fbf9] px-3 py-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Original total</span>
                <span className={originalSubtotal > subtotal ? "line-through text-[var(--muted)]" : ""}>
                  {formatPrice(originalSubtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Discounted subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              {promoDiscount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Promo discount</span>
                  <span className="font-semibold text-[var(--leaf-deep)]">- {formatPrice(promoDiscount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Shipping</span>
                <span className="font-semibold">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--line)] pt-2 text-sm font-semibold">
                <span>Final total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
              {totalSavings > 0 ? <p className="text-[var(--leaf)]">You saved {formatPrice(totalSavings)}</p> : null}
            </div>
          ) : null}

          <Link
            className={`focus-ring mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold transition active:scale-[0.98] ${
              items.length === 0
                ? "pointer-events-none border border-[var(--line)] bg-[var(--mint)] text-[var(--muted)]"
                : "bg-[var(--leaf-deep)] text-white hover:bg-[var(--leaf)]"
            }`}
            href={user ? "/checkout" : "/auth"}
            onClick={closeDrawer}
          >
            {items.length === 0 ? "Add products to continue" : user ? "Checkout" : "Login to Checkout"}
          </Link>
        </div>
      </aside>
    </div>
  );
}
