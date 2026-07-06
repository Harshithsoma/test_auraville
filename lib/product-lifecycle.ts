import type { Product } from "@/types/product";

export function getProductLaunchStatus(
  product: Pick<Product, "availability"> & { launchStatus?: Product["launchStatus"] }
): "active" | "coming-soon" {
  if (product.launchStatus === "coming-soon") return "coming-soon";
  if (!product.launchStatus && product.availability === "coming-soon") return "coming-soon";
  return "active";
}

export function isComingSoonProduct(
  product: Pick<Product, "availability"> & { launchStatus?: Product["launchStatus"] }
): boolean {
  return getProductLaunchStatus(product) === "coming-soon";
}

export function hasPurchasableStock(product: Pick<Product, "variants">): boolean {
  return product.variants.some((variant) => (variant.stock ?? 0) > 0);
}

export function isProductPurchasable(product: Product): boolean {
  return !isComingSoonProduct(product) && hasPurchasableStock(product);
}
