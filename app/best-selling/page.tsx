import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { fetchProducts } from "@/lib/catalog-api";
import { sortStorefrontProducts } from "@/lib/storefront-product-order";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Best Selling Palmyra Snacks",
  description:
    "Explore Auraville best-selling palmyra sprout snacks and discover the community favorites.",
  alternates: {
    canonical: absoluteUrl("/best-selling")
  },
  openGraph: {
    title: "Best Selling | Auraville",
    description: "Shop Auraville best-selling products.",
    url: absoluteUrl("/best-selling")
  }
};

export const dynamic = "force-dynamic";

export default async function BestSellingPage() {
  let bestSellers: Awaited<ReturnType<typeof fetchProducts>>["data"] = [];

  try {
    const response = await fetchProducts({
      page: 1,
      limit: 48,
      bestSeller: true,
      sort: "popular"
    });
    bestSellers = sortStorefrontProducts(response.data);
  } catch {
    // Keep empty state when API is unavailable to avoid stale storefront flags.
  }

  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Auraville Favorites</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Best-selling palmyra picks.
        </h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)]">
          These are the products customers reorder the most from our natural-food range.
        </p>
      </div>

      {bestSellers.length > 0 ? (
        <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Best-selling products">
          {bestSellers.map((product, index) => (
            <ProductCard key={product.id} priority={index < 3} product={product} variantContext="bestSeller" />
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-lg border border-[var(--line)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">Best sellers are updating.</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Please check back in a moment or browse all products.
          </p>
        </section>
      )}
    </div>
  );
}
