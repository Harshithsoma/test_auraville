"use client";

import Image from "next/image";
import Link from "next/link";
import { getCompareAtUnitPrice } from "@/lib/products";
import { getCartSubtotal, useCartStore } from "@/stores/cart-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

const shippingThreshold = 1499;

export default function CartClient() {
  const hasMounted = useHasMounted();
  const { items, removeItem, updateQuantity, promoCode, promoDiscountPercent } = useCartStore();

  const enrichedItems = items.map((item) => {
    const compareAtUnitPrice = getCompareAtUnitPrice(item.productId, item.unitPrice);
    const currentTotal = item.unitPrice * item.quantity;
    const compareAtTotal = compareAtUnitPrice * item.quantity;
    return { ...item, compareAtUnitPrice, currentTotal, compareAtTotal };
  });

  const subtotal = getCartSubtotal(items);
  const originalSubtotal = enrichedItems.reduce((sum, item) => sum + item.compareAtTotal, 0);
  const baseSavings = Math.max(0, originalSubtotal - subtotal);
  const promoDiscount = Math.round((subtotal * promoDiscountPercent) / 100);
  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  const shipping = discountedSubtotal >= shippingThreshold || discountedSubtotal === 0 ? 0 : 99;
  const tax = Math.round(discountedSubtotal * 0.05);
  const total = discountedSubtotal + shipping + tax;
  const totalSavings = baseSavings + promoDiscount;

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
              <div className="mt-3 text-sm">
                <p className="font-semibold">{formatPrice(item.currentTotal)}</p>
                {item.compareAtTotal > item.currentTotal ? (
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
        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Original subtotal</dt>
            <dd className={originalSubtotal > subtotal ? "font-semibold line-through text-[var(--muted)]" : "font-semibold"}>
              {formatPrice(originalSubtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Discounted subtotal</dt>
            <dd className="font-semibold">{formatPrice(subtotal)}</dd>
          </div>
          {promoDiscount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Promo ({promoCode})</dt>
              <dd className="font-semibold text-[var(--leaf-deep)]">- {formatPrice(promoDiscount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Estimated GST</dt>
            <dd className="font-semibold">{formatPrice(tax)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Shipping</dt>
            <dd className="font-semibold">
              {shipping ? formatPrice(shipping) : "Free"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-[var(--line)] pt-4 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatPrice(total)}</dd>
          </div>
        </dl>
        {totalSavings > 0 ? (
          <p className="mt-4 text-xs font-semibold text-[var(--leaf)]">You saved {formatPrice(totalSavings)}</p>
        ) : null}
        <Button className="mt-6 w-full" href="/checkout">
          Checkout
        </Button>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Free shipping above {formatPrice(shippingThreshold)}. Razorpay payment
          handoff is ready for backend wiring.
        </p>
      </aside>
    </div>
  );
}
