"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/services/api";
import { fetchProducts } from "@/lib/catalog-api";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";

type SortKey = "popular" | "newest" | "price-asc" | "price-desc";

type ProductGridClientProps = {
  initialProducts: Product[];
  initialCategories: string[];
  initialTotal: number;
  initialTotalPages: number;
  minPrice: number;
  maxPrice: number;
};

const pageSize = 6;

export function ProductGridClient({
  initialProducts,
  initialCategories,
  initialTotal,
  initialTotalPages,
  minPrice,
  maxPrice
}: ProductGridClientProps) {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const searchFromUrl = searchParams.get("search") ?? "";
  const [category, setCategory] = useState<string | "All">(
    categoryFromUrl && initialCategories.includes(categoryFromUrl) ? categoryFromUrl : "All"
  );
  const [sort, setSort] = useState<SortKey>("popular");
  const [price, setPrice] = useState(maxPrice);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const nextCategory = categoryFromUrl && initialCategories.includes(categoryFromUrl) ? categoryFromUrl : "All";
    setCategory(nextCategory);
  }, [categoryFromUrl, initialCategories]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFirstPage() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetchProducts({
          page: 1,
          limit: pageSize,
          category: category === "All" ? undefined : category,
          sort,
          search: searchFromUrl || undefined
        });
        if (isCancelled) {
          return;
        }

        setProducts(response.data);
        setPage(1);
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setProducts(initialProducts);
        setPage(1);
        setTotalPages(initialTotalPages);
        setTotal(initialTotal);
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError("Unable to load products right now.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFirstPage();

    return () => {
      isCancelled = true;
    };
  }, [category, initialProducts, initialTotal, initialTotalPages, searchFromUrl, sort]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => product.price <= price);
  }, [price, products]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts;

  function updateCategory(value: string | "All") {
    setCategory(value);
    setPage(1);
  }

  function updateSort(value: SortKey) {
    setSort(value);
    setPage(1);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-lg border border-[var(--line)] bg-white p-5 lg:sticky lg:top-28">
        <div>
          <label className="text-sm font-semibold" htmlFor="category">
            Category
          </label>
          <Select
            className="mt-2"
            id="category"
            value={category}
            onChange={(event) => updateCategory(event.target.value as string | "All")}
          >
            <option value="All">All categories</option>
            {initialCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-6">
          <label className="text-sm font-semibold" htmlFor="sort">
            Sort
          </label>
          <Select
            className="mt-2"
            id="sort"
            value={sort}
            onChange={(event) => updateSort(event.target.value as SortKey)}
          >
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </Select>
        </div>

        <div className="mt-6">
          <label className="text-sm font-semibold" htmlFor="price">
            Price up to {formatPrice(price)}
          </label>
          <input
            aria-label="Filter by maximum price"
            className="mt-4 w-full accent-[var(--leaf)]"
            id="price"
            max={maxPrice}
            min={minPrice}
            step="50"
            type="range"
            value={price}
            onChange={(event) => {
              setPrice(Number(event.target.value));
              setPage(1);
            }}
          />
          <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
            <span>{formatPrice(minPrice)}</span>
            <span>{formatPrice(maxPrice)}</span>
          </div>
        </div>
      </aside>

      <section aria-live="polite">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--muted)]">
            {filteredProducts.length} shown of {total} {total === 1 ? "product" : "products"}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCategory("All");
              setSort("popular");
              setPrice(maxPrice);
              setPage(1);
            }}
          >
            Reset filters
          </Button>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-4 text-sm text-[#a84843]">
            {loadError}
          </div>
        ) : null}

        {isLoading && visibleProducts.length === 0 ? (
          <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">Loading products...</h2>
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product, index) => (
              <ProductCard key={product.id} priority={index < 3} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">No products match this filter.</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Reset filters to see the full palmyra range.</p>
          </div>
        )}

        {page < totalPages && pageCount >= 1 ? (
          <div className="mt-10 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              disabled={isLoadingMore}
              onClick={async () => {
                const nextPage = page + 1;
                setIsLoadingMore(true);
                setLoadError(null);
                try {
                  const response = await fetchProducts({
                    page: nextPage,
                    limit: pageSize,
                    category: category === "All" ? undefined : category,
                    sort,
                    search: searchFromUrl || undefined
                  });

                  setProducts((current) => [...current, ...response.data]);
                  setPage(nextPage);
                  setTotalPages(response.pagination.totalPages);
                  setTotal(response.pagination.total);
                } catch (error) {
                  if (error instanceof ApiError) {
                    setLoadError(error.message);
                  } else {
                    setLoadError("Unable to load more products right now.");
                  }
                } finally {
                  setIsLoadingMore(false);
                }
              }}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
