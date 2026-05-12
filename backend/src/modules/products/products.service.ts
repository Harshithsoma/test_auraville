import { HttpError } from "../../utils/http-error";
import { prisma } from "../../prisma/prisma.service";
import type { ProductApiResponse, ProductListQuery, ProductListResult } from "./products.types";

const PRODUCTS_LIST_CACHE_TTL_MS = 45_000;
const MAX_PRODUCTS_LIST_CACHE_ENTRIES = 100;

type CachedProductListEntry = {
  expiresAt: number;
  value: ProductListResult;
};

const productsListCache = new Map<string, CachedProductListEntry>();

export function invalidateProductsListCache(): void {
  productsListCache.clear();
}

function toAvailability(value: string): "available" | "coming-soon" {
  return value === "coming_soon" ? "coming-soon" : "available";
}

function toDbAvailability(value: "available" | "coming-soon"): "available" | "coming_soon" {
  return value === "coming-soon" ? "coming_soon" : "available";
}

function mapProduct(product: {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice: number | null;
  promoLabel: string | null;
  currency: string;
  image: string;
  availability: string;
  releaseNote: string | null;
  rating: unknown;
  reviewCount: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  badgeLabel: string | null;
  popularity: number;
  ingredients: string[];
  benefits: string[];
  category: { name: string };
  images: Array<{ url: string; position: number }>;
  variants: Array<{ frontendVariantId: string; label: string; price: number; unit: string; stock: number }>;
}): ProductApiResponse {
  const gallery = product.images
    .sort((a, b) => a.position - b.position)
    .map((image) => image.url);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    longDescription: product.longDescription,
    price: product.price,
    ...(product.compareAtPrice !== null ? { compareAtPrice: product.compareAtPrice } : {}),
    ...(product.promoLabel !== null ? { promoLabel: product.promoLabel } : {}),
    currency: product.currency as "INR",
    image: product.image,
    gallery,
    category: product.category.name,
    availability: toAvailability(product.availability),
    ...(product.releaseNote !== null ? { releaseNote: product.releaseNote } : {}),
    rating: typeof product.rating === "number" ? product.rating : Number(product.rating),
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNew: product.isNew,
    ...(product.badgeLabel !== null ? { badgeLabel: product.badgeLabel } : {}),
    popularity: product.popularity,
    ingredients: product.ingredients,
    benefits: product.benefits,
    variants: product.variants.map((variant) => ({
      id: variant.frontendVariantId,
      label: variant.label,
      price: variant.price,
      unit: variant.unit,
      stock: variant.stock
    }))
  };
}

function parseSort(sort: ProductListQuery["sort"]) {
  if (sort === "price-asc") {
    return [{ price: "asc" as const }];
  }

  if (sort === "price-desc") {
    return [{ price: "desc" as const }];
  }

  if (sort === "newest") {
    return [{ isNew: "desc" as const }, { createdAt: "desc" as const }];
  }

  return [{ popularity: "desc" as const }];
}

function getListCacheKey(query: ProductListQuery): string {
  return JSON.stringify({
    ...query,
    search: query.search?.trim().toLowerCase() ?? ""
  });
}

function readListCache(key: string): ProductListResult | null {
  const cached = productsListCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    productsListCache.delete(key);
    return null;
  }

  return cached.value;
}

function writeListCache(key: string, value: ProductListResult): void {
  if (productsListCache.size >= MAX_PRODUCTS_LIST_CACHE_ENTRIES) {
    const oldestKey = productsListCache.keys().next().value;
    if (oldestKey) {
      productsListCache.delete(oldestKey);
    }
  }

  productsListCache.set(key, {
    expiresAt: Date.now() + PRODUCTS_LIST_CACHE_TTL_MS,
    value
  });
}

export async function listProducts(query: ProductListQuery): Promise<ProductListResult> {
  const cacheKey = getListCacheKey(query);
  const cached = readListCache(cacheKey);
  if (cached) {
    return cached;
  }

  const where = {
    isActive: true,
    ...(query.category
      ? {
          category: {
            name: {
              equals: query.category,
              mode: "insensitive" as const
            }
          }
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { tagline: { contains: query.search, mode: "insensitive" as const } },
            { description: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(typeof query.featured === "boolean" ? { isFeatured: query.featured } : {}),
    ...(typeof query.bestSeller === "boolean" ? { isBestSeller: query.bestSeller } : {}),
    ...(typeof query.isNew === "boolean" ? { isNew: query.isNew } : {}),
    ...(query.availability ? { availability: toDbAvailability(query.availability) } : {})
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        images: { select: { url: true, position: true } },
        variants: {
          where: { isActive: true },
          select: {
            frontendVariantId: true,
            label: true,
            price: true,
            unit: true,
            stock: true,
            createdAt: true
          },
          orderBy: [{ createdAt: "asc" }]
        }
      },
      orderBy: parseSort(query.sort),
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  const result: ProductListResult = {
    data: products.map((product: {
      id: string;
      slug: string;
      name: string;
      tagline: string;
      description: string;
      longDescription: string;
      price: number;
      compareAtPrice: number | null;
      promoLabel: string | null;
      currency: string;
      image: string;
      availability: string;
      releaseNote: string | null;
      rating: unknown;
      reviewCount: number;
      isFeatured: boolean;
      isBestSeller: boolean;
      isNew: boolean;
      badgeLabel: string | null;
      popularity: number;
      ingredients: string[];
      benefits: string[];
      category: { name: string };
      images: Array<{ url: string; position: number }>;
      variants: Array<{
        frontendVariantId: string;
        label: string;
        price: number;
        unit: string;
        stock: number;
      }>;
    }) =>
      mapProduct({
        ...product,
        variants: product.variants.map((variant: {
          frontendVariantId: string;
          label: string;
          price: number;
          unit: string;
          stock: number;
        }) => ({
          frontendVariantId: variant.frontendVariantId,
          label: variant.label,
          price: variant.price,
          unit: variant.unit,
          stock: variant.stock
        }))
      })
    ),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
    }
  };

  writeListCache(cacheKey, result);
  return result;
}

export async function getProductBySlug(slug: string): Promise<ProductApiResponse> {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      isActive: true
    },
    include: {
      category: { select: { name: true } },
      images: { select: { url: true, position: true } },
      variants: {
        where: { isActive: true },
        select: {
          frontendVariantId: true,
          label: true,
          price: true,
          unit: true,
          stock: true,
          createdAt: true
        },
        orderBy: [{ createdAt: "asc" }]
      }
    }
  });

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  return mapProduct({
    ...product,
    variants: product.variants.map((variant: {
      frontendVariantId: string;
      label: string;
      price: number;
      unit: string;
      stock: number;
    }) => ({
      frontendVariantId: variant.frontendVariantId,
      label: variant.label,
      price: variant.price,
      unit: variant.unit,
      stock: variant.stock
    }))
  });
}
