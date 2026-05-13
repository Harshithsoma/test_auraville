import type { Product, ProductVariant } from "@/types/product";

export type DisplayVariantSelection = {
  variant: ProductVariant | null;
  isOutOfStock: boolean;
  compareAtPrice?: number;
};

function computeVariantCompareAtPrice(product: Product, variant: ProductVariant): number | undefined {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price || product.price <= 0) {
    return undefined;
  }

  const ratio = product.compareAtPrice / product.price;
  const variantCompareAtPrice = Math.round(variant.price * ratio);
  return variantCompareAtPrice > variant.price ? variantCompareAtPrice : undefined;
}

export function selectCardDisplayVariant(product: Product): DisplayVariantSelection {
  const inStockVariant = product.variants.find((variant) => (variant.stock ?? 0) > 0);
  const firstVariant = product.variants[0] ?? null;
  const variant = inStockVariant ?? firstVariant;

  if (!variant) {
    return {
      variant: null,
      isOutOfStock: true
    };
  }

  return {
    variant,
    isOutOfStock: (variant.stock ?? 0) <= 0,
    compareAtPrice: computeVariantCompareAtPrice(product, variant)
  };
}
