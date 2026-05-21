"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";

type AdminShellProps = {
  children: ReactNode;
};

type AdminNavItem = {
  label: string;
  href: string;
};

const adminNav: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Homepage", href: "/admin/homepage" },
  { label: "Uploads", href: "/admin/uploads" }
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasMounted || isHydrating || !hasHydrated) {
      return;
    }

    if (!user) {
      router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [hasHydrated, hasMounted, isHydrating, pathname, router, user]);

  if (!hasMounted || isHydrating || !hasHydrated) {
    return (
      <div className="container-page py-12 md:py-16">
        <div className="rounded-xl border border-[var(--line)] bg-white p-8 shadow-sm">Loading admin workspace...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-12 md:py-16">
        <div className="rounded-xl border border-[var(--line)] bg-white p-8 shadow-sm">Redirecting to login...</div>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="container-page py-12 md:py-16">
        <section className="rounded-xl border border-[var(--line)] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Access denied</p>
          <h1 className="mt-3 text-3xl font-semibold">Admin permissions required.</h1>
          <p className="mt-3 text-[var(--muted)]">Your account does not have access to the Auraville admin panel.</p>
          <Link
            className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] px-5 py-3 text-sm font-semibold transition hover:border-[var(--leaf)]"
            href="/"
          >
            Back to storefront
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container-page py-8 md:py-12">
      <div className="mb-6 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:hidden">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Admin navigation</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {adminNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--leaf-deep)] text-white active:scale-[0.98] active:opacity-90"
                    : "border border-[var(--line)] bg-[var(--mint)] text-[var(--leaf-deep)] active:scale-[0.98] active:opacity-80"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <aside className="hidden h-fit rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:sticky md:top-24 md:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Admin panel</p>
          <nav className="space-y-1" aria-label="Admin navigation">
            {adminNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  className={`focus-ring block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--leaf-deep)] text-white active:scale-[0.99] active:opacity-90"
                      : "text-[var(--leaf-deep)] hover:bg-[var(--mint)] active:scale-[0.99] active:opacity-80"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
