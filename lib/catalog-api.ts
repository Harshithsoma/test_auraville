import type { Product } from "@/types/product";
import { commerceApi } from "@/services/api";
import { sortStorefrontProducts } from "@/lib/storefront-product-order";

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
  launchStatus?: "active" | "coming-soon";
  sort?: "popular" | "price-asc" | "price-desc" | "newest";
};

const inFlightProductListRequests = new Map<string, Promise<ProductsListResponse>>();
const inFlightProductDetailRequests = new Map<string, Promise<ProductResponse>>();

function productListRequestKey(query?: ProductsListQuery): string {
  if (!query) return "{}";
  const entries = Object.entries(query)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

export async function fetchProducts(query?: ProductsListQuery): Promise<ProductsListResponse> {
  const key = productListRequestKey(query);
  const existing = inFlightProductListRequests.get(key);
  if (existing) return existing;

  const request = commerceApi.products.list<ProductsListResponse>(query)
    .then((response) => ({
      ...response,
      data: sortStorefrontProducts(response.data)
    }))
    .finally(() => {
      inFlightProductListRequests.delete(key);
    });

  inFlightProductListRequests.set(key, request);
  return request;
}

export async function fetchProductBySlug(slug: string): Promise<ProductResponse> {
  const key = slug.trim().toLowerCase();
  const existing = inFlightProductDetailRequests.get(key);
  if (existing) return existing;

  const request = commerceApi.products.bySlug<ProductResponse>(slug).finally(() => {
    inFlightProductDetailRequests.delete(key);
  });

  inFlightProductDetailRequests.set(key, request);
  return request;
}

export async function fetchCategories(): Promise<CategoriesResponse> {
  return commerceApi.categories.list<CategoriesResponse>();
}
