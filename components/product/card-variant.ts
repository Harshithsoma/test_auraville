import type { Product, ProductVariant } from "@/types/product";

export type DisplayVariantSelection = {
  variant: ProductVariant | null;
  isOutOfStock: boolean;
  compareAtPrice?: number;
};

type VariantContext = "default" | "featured" | "bestSeller";

function isInStock(variant: ProductVariant): boolean {
  return (variant.stock ?? 0) > 0;
}

function sortByDisplayPriority(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort((a, b) => {
    const stockRankA = isInStock(a) ? 0 : 1;
    const stockRankB = isInStock(b) ? 0 : 1;
    if (stockRankA !== stockRankB) return stockRankA - stockRankB;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

function pickVariantByContext(product: Product, context: VariantContext): ProductVariant | null {
  const variants = product.variants ?? [];
  if (!variants.length) return null;

  const ordered = sortByDisplayPriority(variants);
  if (context === "featured") {
    return (
      ordered.find((variant) => variant.isFeatured && isInStock(variant)) ??
      ordered.find((variant) => variant.isFeatured) ??
      ordered[0] ??
      null
    );
  }

  if (context === "bestSeller") {
    return (
      ordered.find((variant) => variant.isBestSeller && isInStock(variant)) ??
      ordered.find((variant) => variant.isBestSeller) ??
      ordered[0] ??
      null
    );
  }

  return ordered[0] ?? null;
}

function computeVariantCompareAtPrice(variant: ProductVariant): number | undefined {
  const compareAt = variant.compareAtPrice;
  if (!compareAt || compareAt <= variant.price) {
    return undefined;
  }
  return compareAt;
}

export function getVariantCompareAtPrice(_product: Product, variant: ProductVariant): number | undefined {
  return computeVariantCompareAtPrice(variant);
}

export function selectDefaultProductVariant(variants: ProductVariant[]): ProductVariant | null {
  if (!variants.length) {
    return null;
  }
  return sortByDisplayPriority(variants)[0] ?? null;
}

export function selectContextDisplayVariant(
  product: Product,
  context: VariantContext
): DisplayVariantSelection {
  const variant = pickVariantByContext(product, context);

  if (!variant) {
    return {
      variant: null,
      isOutOfStock: true
    };
  }

  return {
    variant,
    isOutOfStock: !isInStock(variant),
    compareAtPrice: computeVariantCompareAtPrice(variant)
  };
}

export function selectCardDisplayVariant(product: Product): DisplayVariantSelection {
  return selectContextDisplayVariant(product, "default");
}
