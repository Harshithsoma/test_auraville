import type { Metadata } from "next";
import { ProductGridClient } from "@/components/product/product-grid-client";
import { categories as fallbackCategories, products as fallbackProducts } from "@/lib/products";
import { fetchCategories, fetchProducts } from "@/lib/catalog-api";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shop Palmyra Sprout Snacks",
  description:
    "Shop Auraville palmyra sprout energy bars and preview coming-soon cookies, health mix, laddu, and combos.",
  alternates: {
    canonical: absoluteUrl("/products")
  },
  openGraph: {
    title: "Shop Palmyra Sprout Snacks | Auraville",
    description:
      "Palmyra sprout energy bars available now, with cookies, health mix, laddu, and combos coming soon.",
    url: absoluteUrl("/products")
  }
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  let initialProducts = fallbackProducts;
  let initialCategories = fallbackCategories;
  let initialTotalPages = 1;
  let initialTotal = fallbackProducts.length;

  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      fetchProducts({ page: 1, limit: 12, sort: "popular" }),
      fetchCategories()
    ]);

    initialProducts = productsResponse.data;
    initialTotalPages = productsResponse.pagination.totalPages;
    initialTotal = productsResponse.pagination.total;

    if (categoriesResponse.data.length > 0) {
      initialCategories = categoriesResponse.data;
    }
  } catch {
    // Fallback to bundled catalog if API is unavailable.
  }

  const prices = initialProducts.map((product) => product.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Shop Auraville</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Shop the palmyra sprout range.
        </h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)]">
          The energy bar is ready to buy now. The rest of the shelf is marked clearly as coming soon.
        </p>
      </div>
      <div className="mt-10">
        <ProductGridClient
          initialCategories={initialCategories}
          initialProducts={initialProducts}
          initialTotal={initialTotal}
          initialTotalPages={initialTotalPages}
          maxPrice={maxPrice}
          minPrice={minPrice}
        />
      </div>
    </div>
  );
}
