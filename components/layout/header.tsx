import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { categories } from "@/lib/products";
import { marketSpotlight } from "@/lib/promotions";
import { CartStatus } from "@/components/layout/cart-status";
import { IconLink } from "@/components/layout/icon-link";
import { ProfileStatus } from "@/components/layout/profile-status";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(251,255,252,0.9)] backdrop-blur">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <Link className="brand-mark focus-ring rounded-lg text-2xl font-bold" href="/" aria-label="Auraville home">
          Auraville
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-6 lg:flex">
          <Link
            className="focus-ring rounded-lg text-sm font-bold text-[var(--coral)] transition hover:text-[var(--foreground)]"
            href={marketSpotlight.href}
          >
            {marketSpotlight.label}
          </Link>
          <div className="group relative">
            <Link
              className="focus-ring inline-flex rounded-lg text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
              href="/products"
            >
              Shop
            </Link>
            <div className="invisible absolute left-0 top-full w-64 translate-y-3 rounded-lg border border-[var(--line)] bg-white p-3 opacity-0 shadow-xl shadow-[#17211c1a] transition group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-2 group-focus-within:opacity-100">
              <Link
                className="focus-ring block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--mint)]"
                href="/products"
              >
                All products
              </Link>
              {categories.map((category) => (
                <Link
                  className="focus-ring block rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--mint)] hover:text-[var(--foreground)]"
                  href={`/products?category=${category}`}
                  key={category}
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
        <div className="flex items-center gap-3">
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
          <ProfileStatus />
          <CartStatus />
        </div>
      </div>
    </header>
  );
}
