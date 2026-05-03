"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { marketSpotlight } from "@/lib/promotions";

const primaryLinks = [
  { label: "Launch Offer", href: marketSpotlight.href },
  { label: "Orders", href: "/orders" },
  { label: "Best Selling", href: "/product/palmyra-sprout-energy-bar" },
  { label: "About Us", href: "/about" },
  { label: "Coming Soon", href: "/coming-soon" }
];

type MobileMenuProps = {
  categories: string[];
};

export function MobileMenu({ categories }: MobileMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const shopActive = pathname.startsWith("/products") || pathname.startsWith("/product/");

  function close() {
    setIsOpen(false);
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

  function navItemClass(href: string, emphasize = false): string {
    const active = isRouteActive(href);
    if (active) {
      return "focus-ring block rounded-lg border border-[var(--leaf)] bg-[var(--mint)] px-4 py-3 text-sm font-semibold text-[var(--leaf-deep)]";
    }

    return `focus-ring block rounded-lg border px-4 py-3 text-sm ${
      emphasize
        ? "border-[var(--line)] bg-white font-semibold text-[var(--foreground)] hover:bg-[var(--mint)]"
        : "border-[var(--line)] bg-white text-[var(--foreground)] hover:bg-[var(--mint)]"
    }`;
  }

  return (
    <div className="lg:hidden">
      <button
        aria-controls="mobile-navigation-drawer"
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

      {typeof document !== "undefined" && isOpen
        ? createPortal(
            <div className="fixed inset-0 z-[120]">
          <button
            aria-label="Close menu"
            className="absolute inset-0 z-0 bg-black/35"
            type="button"
            onClick={close}
          />
          <aside
            className="absolute left-0 top-0 z-10 flex h-dvh w-[88vw] max-w-sm animate-[slideIn_.22s_ease-out] flex-col overflow-y-auto border-r border-[var(--line)] bg-white p-5 shadow-2xl"
            id="mobile-navigation-drawer"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-2xl font-bold">Menu</p>
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
                      className={navItemClass(link.href, true)}
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
                <div className="grid gap-2 rounded-lg bg-[var(--mint)] p-2">
                  <Link
                    className={`focus-ring rounded-lg px-4 py-3 text-sm font-semibold ${
                      shopActive
                        ? "border border-[var(--leaf)] bg-[var(--mint)] text-[var(--leaf-deep)]"
                        : "bg-white text-[var(--foreground)] hover:bg-[#f7fff8]"
                    }`}
                    href="/products"
                    onClick={close}
                  >
                    All Products
                  </Link>
                  {categories.map((category) => (
                    <Link
                      className="focus-ring rounded-lg bg-white px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[#f7fff8]"
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
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
