import type { Product } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";

export function BestSellerCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return <ProductCard layout="carousel" priority={priority} product={product} variantContext="bestSeller" />;
}
