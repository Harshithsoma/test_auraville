"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/site";
import { categories } from "@/lib/products";
import { marketSpotlight } from "@/lib/promotions";
import { CartStatus } from "@/components/layout/cart-status";
import { IconLink } from "@/components/layout/icon-link";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { ProfileStatus } from "@/components/layout/profile-status";

export function Header() {
  const [isShopOpen, setIsShopOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const shopContainerRef = useRef<HTMLDivElement>(null);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openShop() {
    clearCloseTimer();
    setIsShopOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsShopOpen(false);
    }, 160);
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!shopContainerRef.current?.contains(event.target as Node)) {
        setIsShopOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsShopOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
      clearCloseTimer();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(251,255,252,0.9)] backdrop-blur">
      <div className="container-page flex h-20 items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <MobileMenu />
          <Link className="brand-mark focus-ring rounded-lg text-lg font-bold sm:text-2xl" href="/" aria-label="Auraville home">
            Auraville
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="hidden items-center gap-6 lg:flex">
          <Link
            className="focus-ring rounded-lg text-sm font-bold text-[var(--coral)] transition hover:text-[var(--foreground)]"
            href={marketSpotlight.href}
          >
            {marketSpotlight.label}
          </Link>

          <div
            className="relative"
            ref={shopContainerRef}
            onMouseEnter={openShop}
            onMouseLeave={scheduleClose}
          >
            <button
              aria-expanded={isShopOpen}
              aria-haspopup="menu"
              className="focus-ring inline-flex items-center gap-1 rounded-lg text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
              type="button"
              onClick={() => setIsShopOpen((current) => !current)}
            >
              Shop
              <span className={`text-xs transition ${isShopOpen ? "rotate-180" : ""}`}>▾</span>
            </button>

            <div
              className={`absolute left-0 top-full mt-2 w-64 rounded-lg border border-[var(--line)] bg-white p-3 shadow-xl shadow-[#17211c1a] transition ${
                isShopOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
              }`}
              onMouseEnter={openShop}
              onMouseLeave={scheduleClose}
            >
              <Link
                className="focus-ring block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--mint)]"
                href="/products"
                onClick={() => setIsShopOpen(false)}
              >
                All products
              </Link>
              {categories.map((category) => (
                <Link
                  className="focus-ring block rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--mint)] hover:text-[var(--foreground)]"
                  href={`/products?category=${category}`}
                  key={category}
                  onClick={() => setIsShopOpen(false)}
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>

          <Link
            className="focus-ring rounded-lg text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            href="/product/palmyra-sprout-energy-bar"
          >
            Best Selling
          </Link>

          {siteConfig.nav.map((item) => (
            <Link
              className="focus-ring rounded-lg text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <IconLink href="/search" label="Search products">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="m20 20-4.2-4.2m1.2-5.3a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </IconLink>
          <IconLink href="/orders" label="View orders">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2M9 13h6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </IconLink>
          <ProfileStatus />
          <CartStatus />
        </div>
      </div>
    </header>
  );
}
