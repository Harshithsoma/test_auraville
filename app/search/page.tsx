import type { Metadata } from "next";
import { SearchClient } from "@/components/search/search-client";
import { fetchProducts } from "@/lib/catalog-api";
import { products as fallbackProducts } from "@/lib/products";
import { sortProductsByName } from "@/lib/product-name-sort";
import { sortStorefrontProducts } from "@/lib/storefront-product-order";
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

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawSearch = resolvedSearchParams.search;
  const initialQuery = typeof rawSearch === "string" ? rawSearch.trim() : "";
  let initialProducts = initialQuery ? [] : sortProductsByName(sortStorefrontProducts(fallbackProducts));

  try {
    const response = await fetchProducts({
      page: 1,
      limit: 24,
      sort: "popular",
      search: initialQuery || undefined
    });
    initialProducts = sortProductsByName(sortStorefrontProducts(response.data));
  } catch {
    // Keep query-specific empty state if API is unavailable.
  }

  return (
    <div className="container-page py-12 md:py-16">
      {initialQuery ? (
        <div className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Search results for “{initialQuery}”
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {initialProducts.length} {initialProducts.length === 1 ? "product" : "products"} found
          </p>
        </div>
      ) : (
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Search</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Find products and upcoming launches.
          </h1>
        </div>
      )}
      <SearchClient
        initialProducts={initialProducts}
        initialQuery={initialQuery}
        showSearchInput={!initialQuery}
      />
    </div>
  );
}
