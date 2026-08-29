import type { Product } from "@/types/product";
import { getProductAvailabilityRank } from "@/lib/product-lifecycle";

export function sortStorefrontProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const rankDelta = getProductAvailabilityRank(a) - getProductAvailabilityRank(b);
    if (rankDelta !== 0) {
      return rankDelta;
    }
    return 0;
  });
}
