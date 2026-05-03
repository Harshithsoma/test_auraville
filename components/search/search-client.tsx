"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/services/api";
import { fetchProducts } from "@/lib/catalog-api";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { Input } from "@/components/ui/input";

type SearchClientProps = {
  initialProducts: Product[];
};

export function SearchClient({ initialProducts }: SearchClientProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const searchTerm = query.trim();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchProducts({
          page: 1,
          limit: 24,
          sort: "popular",
          search: searchTerm || undefined
        });

        if (!controller.signal.aborted) {
          setResults(response.data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults(initialProducts);
          if (error instanceof ApiError) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage("Unable to search products right now.");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [initialProducts, query]);

  return (
    <section>
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
      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] px-4 py-3 text-sm text-[#a84843]">
          {errorMessage}
        </div>
      ) : null}
      {isLoading ? <p className="mt-4 text-sm text-[var(--muted)]">Searching...</p> : null}
      <p className="mt-5 text-sm text-[var(--muted)]">{results.length} results</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
