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

export function hasPurchasableStock(product: Pick<Product, "variants">): boolean {
  return product.variants.some(isVariantPurchasable);
}

export function isProductPurchasable(product: Product): boolean {
  return hasPurchasableStock(product);
}
