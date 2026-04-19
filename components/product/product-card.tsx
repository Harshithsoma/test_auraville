"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { Product } from "@/types/product";
import { Price } from "@/components/ui/price";
import { useCartStore } from "@/stores/cart-store";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const isAvailable = product.availability === "available";
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const variant = product.variants[0];
  const cartItem = variant
    ? items.find((item) => item.productId === product.id && item.variantId === variant.id)
    : undefined;
  const quantity = cartItem?.quantity ?? 0;

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyContact, setNotifyContact] = useState("");
  const [notifyStatus, setNotifyStatus] = useState("");

  function addToCart() {
    if (!variant) return;
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
  }

  function decreaseQuantity() {
    if (!variant || quantity === 0) return;
    if (quantity === 1) {
      removeItem(product.id, variant.id);
      return;
    }
    updateQuantity(product.id, variant.id, quantity - 1);
  }

  function increaseQuantity() {
    if (!variant) return;
    addToCart();
  }

  function submitNotify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = notifyContact.trim();
    const valid =
      /^\S+@\S+\.\S+$/.test(value) || /^(?:\+?\d{1,3}[- ]?)?\d{10}$/.test(value.replace(/\s+/g, ""));

    if (!valid) {
      setNotifyStatus("Enter a valid email or phone number.");
      return;
    }

    const requests = JSON.parse(localStorage.getItem("auraville-notify-requests") ?? "[]") as Array<{
      productId: string;
      productName: string;
      contact: string;
      createdAt: string;
    }>;
    requests.push({
      productId: product.id,
      productName: product.name,
      contact: value,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem("auraville-notify-requests", JSON.stringify(requests));
    setNotifyStatus("Thanks. We will notify you when this is back in stock.");
    setNotifyContact("");
  }

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--line)] bg-white transition active:scale-[0.99]">
      <Link className="focus-ring block rounded-lg" href={`/product/${product.slug}`}>
        <div className="relative aspect-[4/4.35] overflow-hidden bg-[var(--mint)]">
          <Image
            alt={product.name}
            className="object-cover"
            fill
            priority={priority}
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            src={product.image}
          />
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-[var(--leaf-deep)]">
            {isAvailable ? "Available Now" : "Out of Stock"}
          </span>
        </div>
      </Link>

      <div className="mt-2.5 border-t border-[var(--line)] px-3 pb-3 pt-3">
        <Link className="focus-ring block rounded-lg" href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-9 text-xs font-bold leading-5 sm:text-sm">{product.name}</h3>
        </Link>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)] sm:text-xs">
          <span>{variant?.label ?? "Pack"}</span>
          <span aria-label={`${product.rating.toFixed(1)} star rating`}>★ {product.rating.toFixed(1)}</span>
        </div>
        <p className="mt-2 text-sm font-bold sm:text-base">
          {isAvailable ? <Price currency={product.currency} value={product.price} /> : "Coming Soon"}
        </p>

        {isAvailable ? (
          quantity === 0 ? (
            <button
              className="focus-ring mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--leaf)] bg-[var(--leaf)] px-3 text-xs font-semibold text-white transition active:scale-95 sm:h-10 sm:text-sm"
              type="button"
              onClick={addToCart}
            >
              Add to Cart
            </button>
          ) : (
            <div className="mt-3 inline-flex h-9 w-full items-center justify-between rounded-lg border border-[var(--line)] sm:h-10">
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
                className="focus-ring h-full w-10 rounded-r-lg text-lg font-semibold text-[var(--leaf-deep)] transition active:scale-95"
                type="button"
                onClick={increaseQuantity}
              >
                +
              </button>
            </div>
          )
        ) : (
          <>
            <button
              className="focus-ring mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 text-xs font-semibold text-[var(--leaf-deep)] transition active:scale-95 sm:h-10 sm:text-sm"
              type="button"
              onClick={() => setNotifyOpen((current) => !current)}
            >
              Notify Me
            </button>
            {notifyOpen ? (
              <form className="mt-3 space-y-2" onSubmit={submitNotify}>
                <input
                  aria-label={`Email or phone for ${product.name}`}
                  className="focus-ring h-9 w-full rounded-lg border border-[var(--line)] px-3 text-xs text-[var(--foreground)] sm:text-sm"
                  placeholder="Email or phone"
                  type="text"
                  value={notifyContact}
                  onChange={(event) => setNotifyContact(event.target.value)}
                />
                <button
                  className="focus-ring inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--leaf)] bg-white px-3 text-xs font-semibold text-[var(--leaf-deep)] transition active:scale-95 sm:text-sm"
                  type="submit"
                >
                  Submit
                </button>
                {notifyStatus ? <p className="text-[11px] text-[var(--leaf-deep)]">{notifyStatus}</p> : null}
              </form>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
