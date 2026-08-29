import type { Product, ProductVariant } from "@/types/product";

export function isVariantActive(variant: ProductVariant | null | undefined): boolean {
  return variant?.isActive !== false;
}

export function isVariantPurchasable(variant: ProductVariant | null | undefined): boolean {
  return Boolean(variant && isVariantActive(variant) && (variant.stock ?? 0) > 0);
}

export function isComingSoonProduct(product: Pick<Product, "variants">): boolean {
  return product.variants.some((variant) => !isVariantActive(variant));
}

export type ProductAvailabilityState = "purchasable" | "out-of-stock" | "coming-soon";

export function getProductAvailabilityState(product: Pick<Product, "variants">): ProductAvailabilityState {
  if (product.variants.some(isVariantPurchasable)) {
    return "purchasable";
  }

  if (product.variants.some(isVariantActive)) {
    return "out-of-stock";
  }

  return "coming-soon";
}

export function getProductAvailabilityRank(product: Pick<Product, "variants">): number {
  const state = getProductAvailabilityState(product);
  if (state === "purchasable") return 0;
  if (state === "out-of-stock") return 1;
  return 2;
}

export function hasPurchasableStock(product: Pick<Product, "variants">): boolean {
  return product.variants.some(isVariantPurchasable);
}

export function isProductPurchasable(product: Product): boolean {
  return hasPurchasableStock(product);
}
