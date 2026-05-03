export type ProductCategory = string;

export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  unit: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice?: number;
  promoLabel?: string;
  currency: "INR";
  image: string;
  gallery: string[];
  category: ProductCategory;
  availability: "available" | "coming-soon";
  releaseNote?: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isNew: boolean;
  badgeLabel?: string;
  popularity: number;
  ingredients: string[];
  benefits: string[];
  variants: ProductVariant[];
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
};
