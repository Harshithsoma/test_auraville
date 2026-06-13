import type { Product } from "@/types/product";

export function sortProductsByName(products: Product[]): Product[] {
  return [...products].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

