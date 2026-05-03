"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartPricing } from "@/hooks/use-cart-pricing";
import { useCartStore } from "@/stores/cart-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

export default function CartClient() {
  const hasMounted = useHasMounted();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const promoCode = useCartStore((state) => state.promoCode);
  const { summary, enrichedItems, pricingError, isBackendPricing, isPricingLoading } = useCartPricing();

  if (!hasMounted) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-white p-8">
        Loading cart...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold">
          Your cart is ready for the energy bar.
        </h2>
        <p className="mt-3 text-[var(--muted)]">
          Start with the palmyra sprout energy bar. More products are coming
          soon.
        </p>
        <Button className="mt-6" href="/products">
          Shop products
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4" aria-label="Cart items">
        {enrichedItems.map((item) => (
          <article
            className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[120px_1fr_auto]"
            key={`${item.productId}-${item.variantId}`}
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--mint)]">
              <Image
                alt={item.name}
                className="object-cover"
                fill
                sizes="120px"
                src={item.image}
              />
            </div>
            <div>
              <Link
                className="focus-ring rounded-lg text-lg font-semibold"
                href={`/product/${item.slug}`}
              >
                {item.name}
              </Link>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {item.variantLabel}
              </p>
              {!item.available ? (
                <p className="mt-1 text-xs font-semibold text-[var(--coral)]">Currently unavailable</p>
              ) : null}
              <div className="mt-3 text-sm">
                <p className="font-semibold">{formatPrice(item.lineTotal)}</p>
                {item.compareAtTotal > item.lineTotal ? (
                  <p className="text-xs text-[var(--muted)] line-through">{formatPrice(item.compareAtTotal)}</p>
                ) : null}
              </div>
              <button
                className="focus-ring mt-4 rounded-lg text-sm font-semibold text-[var(--coral)]"
                type="button"
                onClick={() => removeItem(item.productId, item.variantId)}
              >
                Remove
              </button>
            </div>
            <div className="flex items-start sm:justify-end">
              <QuantityStepper
                value={item.quantity}
                onChange={(quantity) =>
                  updateQuantity(item.productId, item.variantId, quantity)
                }
              />
            </div>
          </article>
        ))}
      </section>

      <aside className="h-fit rounded-lg border border-[var(--line)] bg-white p-6 lg:sticky lg:top-28">
        <h2 className="text-xl font-semibold">Price breakdown</h2>
        {isPricingLoading ? <p className="mt-3 text-xs text-[var(--muted)]">Refreshing live pricing...</p> : null}
        {pricingError ? (
          <p className="mt-3 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] px-3 py-2 text-xs font-semibold text-[var(--coral)]">
            {pricingError}
          </p>
        ) : null}
        {!isBackendPricing ? (
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-xs text-[var(--muted)]">
            Live backend pricing is unavailable. Showing local estimate.
          </p>
        ) : null}
        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Original subtotal</dt>
            <dd className={summary.originalSubtotal > summary.subtotal ? "font-semibold line-through text-[var(--muted)]" : "font-semibold"}>
              {formatPrice(summary.originalSubtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Discounted subtotal</dt>
            <dd className="font-semibold">{formatPrice(summary.subtotal)}</dd>
          </div>
          {summary.promoDiscount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Promo ({promoCode})</dt>
              <dd className="font-semibold text-[var(--leaf-deep)]">- {formatPrice(summary.promoDiscount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Estimated GST</dt>
            <dd className="font-semibold">{formatPrice(summary.gst)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Shipping</dt>
            <dd className="font-semibold">
              {summary.shipping ? formatPrice(summary.shipping) : "Free"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-[var(--line)] pt-4 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatPrice(summary.total)}</dd>
          </div>
        </dl>
        {summary.totalSavings > 0 ? (
          <p className="mt-4 text-xs font-semibold text-[var(--leaf)]">You saved {formatPrice(summary.totalSavings)}</p>
        ) : null}
        <Button className="mt-6 w-full" href="/checkout">
          Checkout
        </Button>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Free shipping above {formatPrice(summary.freeShippingThreshold)}. Razorpay payment
          handoff is ready for backend wiring.
        </p>
      </aside>
    </div>
  );
}
