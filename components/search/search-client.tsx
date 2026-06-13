"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";
import { fetchProducts } from "@/lib/catalog-api";
import { sortProductsByName } from "@/lib/product-name-sort";
import { filterSearchIndex, getSearchIndex } from "@/lib/search-index-cache";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { Input } from "@/components/ui/input";

type SearchClientProps = {
  initialProducts: Product[];
  initialQuery: string;
  showSearchInput: boolean;
};

const SEARCH_DEBOUNCE_MS = 150;

export function SearchClient({ initialProducts, initialQuery, showSearchInput }: SearchClientProps) {
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("search")?.trim() ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const skipInitialFetchRef = useRef(true);

  useEffect(() => {
    setQuery(queryFromUrl);
    setResults(initialProducts);
    setErrorMessage(null);
  }, [initialProducts, queryFromUrl]);

  useEffect(() => {
    const searchTerm = query.trim();
    const localIndex = getSearchIndex();
    if (localIndex && localIndex.length > 0) {
      setResults(sortProductsByName(filterSearchIndex(searchTerm, 24)));
    }

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      if (searchTerm === initialQuery.trim()) {
        return;
      }
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const response = await fetchProducts({
            page: 1,
            limit: 24,
            sort: "popular",
            search: searchTerm || undefined
          });

          if (requestId === requestIdRef.current) {
            setResults(sortProductsByName(response.data));
          }
        } catch (error) {
          if (requestId === requestIdRef.current) {
            setResults(initialProducts);
            if (error instanceof ApiError) {
              setErrorMessage(error.message);
            } else {
              setErrorMessage("Unable to search products right now.");
            }
          }
        } finally {
          if (requestId === requestIdRef.current) {
            setIsLoading(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initialProducts, initialQuery, query]);

  return (
    <section>
      {showSearchInput ? (
        <label className="block max-w-2xl">
          <span className="text-sm font-semibold">Search Auraville</span>
          <Input
            autoFocus
            className="mt-2"
            placeholder="Search energy bar, cookies, laddu..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      ) : null}
      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] px-4 py-3 text-sm text-[#a84843]">
          {errorMessage}
        </div>
      ) : null}
      {isLoading ? <p className="mt-4 text-sm text-[var(--muted)]">Searching...</p> : null}
      {!query.trim() ? <p className="mt-5 text-sm text-[var(--muted)]">{results.length} results</p> : null}
      {results.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">
            {query.trim() ? `No products found for “${query.trim()}”` : "No products found."}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Try a different keyword or browse all products.</p>
          <Link
            className="focus-ring mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold"
            href="/products"
          >
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {results.map((product) => (
            <div key={product.id} className="w-full max-w-[292px] justify-self-center">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
