import type { Product } from "@/types/product";
import { commerceApi } from "@/services/api";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductsListResponse = {
  data: Product[];
  pagination: Pagination;
};

export type ProductResponse = {
  data: Product;
};

export type CategoriesResponse = {
  data: string[];
};

export type ProductsListQuery = {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  availability?: "available" | "coming-soon";
  sort?: "popular" | "price-asc" | "price-desc" | "newest";
};

export async function fetchProducts(query?: ProductsListQuery): Promise<ProductsListResponse> {
  return commerceApi.products.list<ProductsListResponse>(query);
}

export async function fetchProductBySlug(slug: string): Promise<ProductResponse> {
  return commerceApi.products.bySlug<ProductResponse>(slug);
}

export async function fetchCategories(): Promise<CategoriesResponse> {
  return commerceApi.categories.list<CategoriesResponse>();
}
