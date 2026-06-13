"use client";

import type { Product } from "@/types/product";
import { fetchProducts } from "@/lib/catalog-api";
import { sortStorefrontProducts } from "@/lib/storefront-product-order";

const SEARCH_INDEX_STORAGE_KEY = "auraville-search-index-v1";
const SEARCH_INDEX_LIMIT = 100;

let searchIndexCache: Product[] | null = null;
let preloadPromise: Promise<Product[]> | null = null;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function rankForDefault(products: Product[]): Product[] {
  return sortStorefrontProducts(products).sort((a, b) => {
    const aScore = Number(a.isFeatured) * 3 + a.popularity + Number(a.reviewCount > 0);
    const bScore = Number(b.isFeatured) * 3 + b.popularity + Number(b.reviewCount > 0);
    return bScore - aScore;
  });
}

function getAvailabilityRank(product: Product): number {
  if (product.availability === "coming-soon") {
    return 2;
  }
  if (!product.variants || product.variants.length === 0) {
    return 2;
  }
  return product.variants.some((variant) => (variant.stock ?? 0) > 0) ? 0 : 1;
}

function hydrateFromSessionStorage(): Product[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (searchIndexCache && searchIndexCache.length > 0) {
    return searchIndexCache;
  }

  try {
    const raw = window.sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Product[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    searchIndexCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function persistToSessionStorage(products: Product[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(SEARCH_INDEX_STORAGE_KEY, JSON.stringify(products));
  } catch {
    // Ignore storage quota / serialization failures.
  }
}

export function getSearchIndex(): Product[] | null {
  return searchIndexCache ?? hydrateFromSessionStorage();
}

export function preloadSearchIndex(): Promise<Product[]> {
  const existing = getSearchIndex();
  if (existing && existing.length > 0) {
    return Promise.resolve(existing);
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = fetchProducts({
    page: 1,
    limit: SEARCH_INDEX_LIMIT,
    sort: "popular"
  })
    .then((response) => {
      searchIndexCache = response.data;
      persistToSessionStorage(response.data);
      return response.data;
    })
    .finally(() => {
      preloadPromise = null;
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
    return rankForDefault(products).slice(0, limit);
  }

  return products
    .filter((product) => {
      const haystack = `${product.name} ${product.slug} ${product.category} ${product.tagline}`.toLowerCase();
      return haystack.includes(normalized);
    })
    .sort((a, b) => {
      const rankDelta = getAvailabilityRank(a) - getAvailabilityRank(b);
      if (rankDelta !== 0) return rankDelta;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .slice(0, limit);
}
