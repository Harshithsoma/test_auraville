export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING_FEE = 99;

export function calculateVariantCompareAtUnitPrice(params: {
  variantPrice: number;
  variantCompareAtPrice: number | null;
}): number {
  const { variantPrice, variantCompareAtPrice } = params;

  if (!variantCompareAtPrice || variantCompareAtPrice <= variantPrice) {
    return variantPrice;
  }

  return Math.max(variantPrice, variantCompareAtPrice);
}
