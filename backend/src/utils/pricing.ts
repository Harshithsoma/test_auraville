export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING_FEE = 99;

export function calculateCompareAtUnitPrice(params: {
  productPrice: number;
  productCompareAtPrice: number | null;
  variantPrice: number;
}): number {
  const { productPrice, productCompareAtPrice, variantPrice } = params;

  if (!productCompareAtPrice || productCompareAtPrice <= productPrice) {
    return variantPrice;
  }

  const scaled = Math.round((variantPrice * productCompareAtPrice) / productPrice);
  return Math.max(variantPrice, scaled);
}
