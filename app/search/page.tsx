import type { Metadata } from "next";
import { SearchClient } from "@/components/search/search-client";
import { fetchProducts } from "@/lib/catalog-api";
import { products as fallbackProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Auraville products and upcoming palmyra sprout launches.",
  alternates: {
    canonical: absoluteUrl("/search")
  },
  robots: {
    index: false,
    follow: true
  }
};

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  let initialProducts = fallbackProducts;

  try {
    const response = await fetchProducts({ page: 1, limit: 24, sort: "popular" });
    initialProducts = response.data;
  } catch {
    // Fallback to bundled catalog if API is unavailable.
  }

  return (
    <div className="container-page py-12 md:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Search</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Find products and upcoming launches.
        </h1>
      </div>
      <SearchClient initialProducts={initialProducts} />
    </div>
  );
}
