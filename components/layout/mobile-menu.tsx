"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categories } from "@/lib/products";
import { marketSpotlight } from "@/lib/promotions";

const primaryLinks = [
  { label: "Launch Offer", href: marketSpotlight.href },
  { label: "Orders", href: "/orders" },
  { label: "Best Selling", href: "/product/palmyra-sprout-energy-bar" },
  { label: "About Us", href: "/about" },
  { label: "Coming Soon", href: "/coming-soon" }
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        aria-expanded={isOpen}
        aria-label="Open menu"
        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white transition active:scale-95"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <span className="relative h-3.5 w-5">
          <span className="absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current" />
          <span className="absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current" />
          <span className="absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label="Close menu"
            className="absolute inset-0 z-0 bg-black/35"
            type="button"
            onClick={close}
          />
          <aside className="relative z-10 flex h-full w-[86vw] max-w-sm animate-[slideIn_.22s_ease-out] flex-col overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <Link className="brand-mark focus-ring rounded-lg text-2xl font-bold" href="/" onClick={close}>
                Auraville
              </Link>
              <button
                aria-label="Close menu"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] text-xl active:scale-95"
                type="button"
                onClick={close}
              >
                ×
              </button>
            </div>

            <nav className="mt-8 space-y-6" aria-label="Mobile navigation">
              <div>
                <p className="mb-3 text-xs font-bold uppercase text-[var(--coral)]">Highlights</p>
                <div className="grid gap-2">
                  {primaryLinks.map((link) => (
                    <Link
                      className={`focus-ring rounded-lg px-4 py-3 text-sm font-semibold ${
                        link.label === "Launch Offer"
                          ? "bg-[var(--mint)] font-bold text-[var(--leaf-deep)]"
                          : "hover:bg-[var(--mint)]"
                      }`}
                      href={link.href}
                      key={link.href}
                      onClick={close}
                    >
                      {link.label === "Launch Offer" ? `${marketSpotlight.label}: ${marketSpotlight.code}` : link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase text-[var(--coral)]">Shop</p>
                <div className="grid gap-2">
                  <Link className="focus-ring rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[var(--mint)]" href="/products" onClick={close}>
                    All Products
                  </Link>
                  {categories.map((category) => (
                    <Link
                      className="focus-ring rounded-lg px-4 py-3 text-sm text-[var(--muted)] hover:bg-[var(--mint)] hover:text-[var(--foreground)]"
                      href={`/products?category=${category}`}
                      key={category}
                      onClick={close}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
