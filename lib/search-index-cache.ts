"use client";

import type { Product } from "@/types/product";
import { fetchProducts } from "@/lib/catalog-api";
import { rankSearchProducts } from "@/lib/search-ranking";

const SEARCH_INDEX_LIMIT = 100;

let searchIndexCache: Product[] | null = null;
let preloadPromise: Promise<Product[]> | null = null;
let searchIndexVersion = 0;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getSearchIndex(): Product[] | null {
  return searchIndexCache;
}

export function invalidateSearchIndex(): void {
  searchIndexVersion += 1;
  searchIndexCache = null;
  preloadPromise = null;
}

export function preloadSearchIndex(): Promise<Product[]> {
  const existing = getSearchIndex();
  if (existing && existing.length > 0) {
    return Promise.resolve(existing);
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  const requestVersion = searchIndexVersion;
  preloadPromise = fetchProducts({
    page: 1,
    limit: SEARCH_INDEX_LIMIT,
    sort: "popular"
  })
    .then((response) => {
      if (requestVersion !== searchIndexVersion) {
        return searchIndexCache ?? [];
      }

      searchIndexCache = response.data;
      return response.data;
    })
    .finally(() => {
      if (requestVersion === searchIndexVersion) {
        preloadPromise = null;
      }
    });

  return preloadPromise;
}

export function filterSearchIndex(query: string, limit = 7): Product[] {
  const products = getSearchIndex();
  if (!products || products.length === 0) {
    return [];
  }

  const normalized = normalizeQuery(query);
  if (!normalized) {
    return rankSearchProducts(products, "", limit);
  }

  return rankSearchProducts(products, normalized, limit);
}
