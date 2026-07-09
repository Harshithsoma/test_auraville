import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/products";
import { fetchProducts } from "@/lib/catalog-api";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";
import { isComingSoonProduct } from "@/lib/product-lifecycle";

export const metadata: Metadata = {
  title: "Coming Soon Palmyra Snacks",
  description:
    "Preview upcoming Auraville Palmyra Sprouts cookies, health mix, laddu, and healthy Indian snack packs before they launch online.",
  alternates: {
    canonical: absoluteUrl("/coming-soon")
  },
  openGraph: {
    title: "Coming Soon Palmyra Snacks",
    description:
      "Preview upcoming Auraville Palmyra Sprouts cookies, health mix, laddu, and healthy Indian snack packs before they launch online.",
    url: absoluteUrl("/coming-soon"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville coming soon Palmyra snacks" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Coming Soon Palmyra Snacks",
    description:
      "Preview upcoming Auraville Palmyra Sprouts cookies, health mix, laddu, and healthy Indian snack packs before they launch online.",
    images: [defaultShareImageUrl()]
  }
};

export const dynamic = "force-dynamic";

export default async function ComingSoonPage() {
  const isProduction = process.env.NODE_ENV === "production";
  let comingSoon = isProduction ? [] : products.filter(isComingSoonProduct);

  try {
    const response = await fetchProducts({ page: 1, limit: 24, launchStatus: "coming-soon", sort: "newest" });
    comingSoon = response.data.filter(isComingSoonProduct);
  } catch {
    if (!isProduction) {
      comingSoon = products.filter(isComingSoonProduct);
    }
  }

  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Coming soon</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          The next palmyra sprout products.
        </h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)]">
          These recipes are in development. Preview the planned range before launch.
        </p>
      </div>
      {comingSoon.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {comingSoon.map((product) => (
            <ProductCard key={product.id} product={product} variantContext="comingSoon" />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
          No coming-soon products are listed right now.
        </div>
      )}
    </div>
  );
}
