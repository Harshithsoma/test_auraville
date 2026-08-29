import type { Product } from "@/types/product";
import { getProductAvailabilityRank } from "@/lib/product-lifecycle";
import { sortStorefrontProducts } from "@/lib/storefront-product-order";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function rankForDefault(products: Product[]): Product[] {
  return sortStorefrontProducts(products).sort((a, b) => {
    const aScore = Number(a.isFeatured) * 3 + Number(a.isBestSeller) * 2 + a.popularity + Number(a.reviewCount > 0);
    const bScore = Number(b.isFeatured) * 3 + Number(b.isBestSeller) * 2 + b.popularity + Number(b.reviewCount > 0);
    return bScore - aScore;
  });
}

function includesQuery(value: string | undefined, query: string): boolean {
  return Boolean(value && normalizeQuery(value).includes(query));
}

function getTextScore(product: Product, normalizedQuery: string): number {
  const name = normalizeQuery(product.name);
  if (name === normalizedQuery) return 10_000;
  if (name.startsWith(normalizedQuery)) return 9_000;
  if (name.includes(normalizedQuery)) return 8_000;

  if (product.variants?.some((variant) => includesQuery(variant.label, normalizedQuery))) return 6_000;
  if (includesQuery(product.category, normalizedQuery)) return 4_000;
  if (includesQuery(product.description, normalizedQuery)) return 2_000;
  if (includesQuery(product.tagline, normalizedQuery) || includesQuery(product.slug, normalizedQuery)) return 1_000;

  return 0;
}

function getTieBreakerScore(product: Product): number {
  return product.popularity + Number(product.isFeatured) * 3 + Number(product.isBestSeller) * 2 + Number(product.reviewCount > 0);
}

export function rankSearchProducts(products: Product[], query: string, limit?: number): Product[] {
  const normalized = normalizeQuery(query);
  const ranked = !normalized
    ? rankForDefault(products)
    : products
        .map((product) => ({ product, score: getTextScore(product, normalized) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => {
          const scoreDelta = b.score - a.score;
          if (scoreDelta !== 0) return scoreDelta;

          const availabilityDelta = getProductAvailabilityRank(a.product) - getProductAvailabilityRank(b.product);
          if (availabilityDelta !== 0) return availabilityDelta;

          const tieDelta = getTieBreakerScore(b.product) - getTieBreakerScore(a.product);
          if (tieDelta !== 0) return tieDelta;

          return a.product.name.localeCompare(b.product.name, undefined, { sensitivity: "base" });
        })
        .map((entry) => entry.product);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
