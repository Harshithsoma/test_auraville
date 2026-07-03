import type { Metadata } from "next";
import { ProductGridClient } from "@/components/product/product-grid-client";
import { categories as fallbackCategories, products as fallbackProducts } from "@/lib/products";
import { fetchCategories, fetchProducts } from "@/lib/catalog-api";
import { sortStorefrontProducts } from "@/lib/storefront-product-order";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Buy Palmyra Sprouts Snacks Online",
  description:
    "Shop Auraville Palmyra Sprouts snacks online. Buy healthy Indian snacks with dates, palm jaggery, gluten free choices, and fiber rich ingredients.",
  alternates: {
    canonical: absoluteUrl("/products")
  },
  openGraph: {
    title: "Buy Palmyra Sprouts Snacks Online",
    description:
      "Shop Auraville Palmyra Sprouts snacks online. Buy healthy Indian snacks with dates, palm jaggery, gluten free choices, and fiber rich ingredients.",
    url: absoluteUrl("/products"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville Palmyra Sprouts snacks" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy Palmyra Sprouts Snacks Online",
    description:
      "Shop Auraville Palmyra Sprouts snacks online. Buy healthy Indian snacks with dates, palm jaggery, gluten free choices, and fiber rich ingredients.",
    images: [defaultShareImageUrl()]
  }
};

export const dynamic = "force-dynamic";
const isProduction = process.env.NODE_ENV === "production";

export default async function ProductsPage() {
  let initialProducts = isProduction ? [] : sortStorefrontProducts(fallbackProducts);
  let initialCategories = isProduction ? [] : fallbackCategories;
  let initialTotalPages = 1;
  let initialTotal = initialProducts.length;

  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      fetchProducts({ page: 1, limit: 12, sort: "newest" }),
      fetchCategories()
    ]);

    initialProducts = sortStorefrontProducts(productsResponse.data);
    initialTotalPages = productsResponse.pagination.totalPages;
    initialTotal = productsResponse.pagination.total;

    if (categoriesResponse.data.length > 0) {
      initialCategories = categoriesResponse.data;
    }
  } catch {
    if (!isProduction) {
      initialProducts = sortStorefrontProducts(fallbackProducts);
      initialCategories = fallbackCategories;
      initialTotalPages = 1;
      initialTotal = fallbackProducts.length;
    }
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
