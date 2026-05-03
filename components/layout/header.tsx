"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";
import { categories as fallbackCategories } from "@/lib/products";
import { ApiError } from "@/services/api";
import { fetchCategories } from "@/lib/catalog-api";
import { marketSpotlight } from "@/lib/promotions";
import { CartStatus } from "@/components/layout/cart-status";
import { IconLink } from "@/components/layout/icon-link";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { ProfileStatus } from "@/components/layout/profile-status";

export function Header() {
  const pathname = usePathname();
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [currentHash, setCurrentHash] = useState("");
  const closeTimerRef = useRef<number | null>(null);
  const shopContainerRef = useRef<HTMLDivElement>(null);

  const shopActive = pathname.startsWith("/products") || pathname.startsWith("/product/");

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
    function syncHash() {
      setCurrentHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

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

  useEffect(() => {
    let isCancelled = false;

    async function loadCategories() {
      try {
        const response = await fetchCategories();
        if (!isCancelled && response.data.length > 0) {
          setCategories(response.data);
        }
      } catch (error) {
        if (!isCancelled && error instanceof ApiError) {
          // Keep fallback categories when API call fails.
          setCategories(fallbackCategories);
        }
      }
    }

    void loadCategories();

    return () => {
      isCancelled = true;
    };
  }, []);

  function isRouteActive(href: string): boolean {
    const [basePath, hash] = href.split("#");
    if (hash) {
      const expected = `#${hash}`;
      return pathname === (basePath || pathname) && currentHash === expected;
    }

    if (basePath === "/") {
      return pathname === "/";
    }

    return pathname === basePath || pathname.startsWith(`${basePath}/`);
  }

  function navLinkClass(active: boolean): string {
    return `focus-ring relative rounded-lg px-1 py-1 text-sm font-medium transition after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:rounded-full after:bg-[var(--leaf)] after:transition-transform ${
      active
        ? "font-semibold text-[var(--leaf-deep)] after:scale-x-100"
        : "text-[var(--muted)] hover:text-[var(--foreground)] after:scale-x-0 hover:after:scale-x-100"
    }`;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(251,255,252,0.9)] backdrop-blur">
      <div className="container-page flex h-20 items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <MobileMenu categories={categories} />
          <Link className="brand-mark focus-ring rounded-lg text-lg font-bold sm:text-2xl" href="/" aria-label="Auraville home">
            Auraville
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="hidden items-center gap-6 lg:flex">
          <Link
            className={navLinkClass(isRouteActive(marketSpotlight.href))}
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
              className={`focus-ring relative inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium transition after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:rounded-full after:bg-[var(--leaf)] after:transition-transform ${
                shopActive
                  ? "font-semibold text-[var(--leaf-deep)] after:scale-x-100"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] after:scale-x-0 hover:after:scale-x-100"
              }`}
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
            className={navLinkClass(isRouteActive("/product/palmyra-sprout-energy-bar"))}
            href="/product/palmyra-sprout-energy-bar"
          >
            Best Selling
          </Link>

          {siteConfig.nav.map((item) => (
            <Link
              className={navLinkClass(isRouteActive(item.href))}
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
