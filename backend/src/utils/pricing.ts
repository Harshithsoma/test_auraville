export const FREE_SHIPPING_THRESHOLD = 1499;
export const SHIPPING_FEE = 99;
export const GST_RATE = 0.05;

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
