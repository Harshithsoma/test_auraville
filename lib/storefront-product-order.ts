import type { Product } from "@/types/product";

function getAvailabilityRank(product: Product): number {
  if (product.availability === "coming-soon") {
    return 2;
  }

  if (!product.variants || product.variants.length === 0) {
    return 2;
  }

  const hasStock = product.variants.some((variant) => (variant.stock ?? 0) > 0);
  if (hasStock) {
    return 0;
  }

  return 1;
}

export function sortStorefrontProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const rankDelta = getAvailabilityRank(a) - getAvailabilityRank(b);
    if (rankDelta !== 0) {
      return rankDelta;
    }
    return 0;
  });
}
