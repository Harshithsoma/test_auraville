export type ProductApiVariant = {
  id: string;
  label: string;
  price: number;
  unit: string;
};

export type ProductApiResponse = {
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
  category: string;
  availability: "available" | "coming-soon";
  releaseNote?: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  badgeLabel?: string;
  popularity: number;
  ingredients: string[];
  benefits: string[];
  variants: ProductApiVariant[];
};

export type ProductListQuery = {
  page: number;
  limit: number;
  category?: string;
  search?: string;
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  availability?: "available" | "coming-soon";
  sort?: "popular" | "price-asc" | "price-desc" | "newest";
};

export type ProductListResult = {
  data: ProductApiResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
