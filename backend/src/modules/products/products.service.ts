import { Prisma } from "@prisma/client";
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

function variantIsPurchasable(variant: Pick<StorefrontVariantRecord, "isActive" | "stock">): boolean {
  return variant.isActive && variant.stock > 0;
}

function productHasActiveVariant(product: Pick<StorefrontProductRecord, "variants">): boolean {
  return product.variants.some((variant) => variant.isActive);
}

type StorefrontVariantRecord = {
  frontendVariantId: string;
  label: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  unit: string;
  stock: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
};

type StorefrontProductRecord = {
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
  launchStatus?: string | null;
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
  variants: StorefrontVariantRecord[];
};

function getVariantPriority(variant: StorefrontVariantRecord): number {
  if (variant.isActive && variant.stock > 0) return 0;
  if (variant.isActive) return 1;
  return 2;
}

function extractVariantQuantity(variant: StorefrontVariantRecord): number | null {
  const value = `${variant.label} ${variant.unit}`.toLowerCase();
  const match = value.match(/(?:pack|box)?\s*(?:of)?\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortVariants(
  variants: StorefrontVariantRecord[],
  context: "default" | "featured" | "bestSeller"
): StorefrontVariantRecord[] {
  return [...variants].sort((a, b) => {
    const aFlag =
      context === "featured"
        ? a.isFeatured && variantIsPurchasable(a)
        : context === "bestSeller"
          ? a.isBestSeller && variantIsPurchasable(a)
          : true;
    const bFlag =
      context === "featured"
        ? b.isFeatured && variantIsPurchasable(b)
        : context === "bestSeller"
          ? b.isBestSeller && variantIsPurchasable(b)
          : true;
    const aFlagRank = aFlag ? 0 : 1;
    const bFlagRank = bFlag ? 0 : 1;
    if (aFlagRank !== bFlagRank) return aFlagRank - bFlagRank;

    const stockRankDelta = getVariantPriority(a) - getVariantPriority(b);
    if (stockRankDelta !== 0) return stockRankDelta;

    const quantityA = extractVariantQuantity(a);
    const quantityB = extractVariantQuantity(b);
    if (quantityA !== null && quantityB !== null && quantityA !== quantityB) return quantityA - quantityB;
    if (quantityA !== null && quantityB === null) return -1;
    if (quantityA === null && quantityB !== null) return 1;

    const sortOrderDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortOrderDelta !== 0) return sortOrderDelta;

    const priceDelta = a.price - b.price;
    if (priceDelta !== 0) return priceDelta;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

function mapProduct(
  product: StorefrontProductRecord,
  context: "default" | "featured" | "bestSeller" = "default"
): ProductApiResponse {
  const gallery = product.images
    .sort((a, b) => a.position - b.position)
    .map((image) => image.url);
  const orderedVariants = sortVariants(product.variants, context);
  const primaryVariant = orderedVariants[0] ?? null;
  const mappedVariants = orderedVariants.map((variant) => ({
    id: variant.frontendVariantId,
    label: variant.label,
    price: variant.price,
    ...(variant.compareAtPrice !== null && variant.compareAtPrice > variant.price
      ? { compareAtPrice: variant.compareAtPrice }
      : {}),
    discountPercent: variant.discountPercent,
    unit: variant.unit,
    stock: variant.stock,
    isActive: variant.isActive,
    isFeatured: variant.isFeatured,
    isBestSeller: variant.isBestSeller,
    sortOrder: variant.sortOrder
  }));
  const hasActiveVariant = productHasActiveVariant(product);
  const hasFeaturedVariant = product.variants.some((variant) => variant.isFeatured && variantIsPurchasable(variant));
  const hasBestSellerVariant = product.variants.some((variant) => variant.isBestSeller && variantIsPurchasable(variant));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    longDescription: product.longDescription,
    price: primaryVariant?.price ?? product.price,
    ...(primaryVariant?.compareAtPrice !== null &&
    primaryVariant?.compareAtPrice !== undefined &&
    primaryVariant.compareAtPrice > (primaryVariant?.price ?? 0)
      ? { compareAtPrice: primaryVariant.compareAtPrice }
      : product.compareAtPrice !== null && product.compareAtPrice > (primaryVariant?.price ?? product.price)
        ? { compareAtPrice: product.compareAtPrice }
        : {}),
    ...(product.promoLabel !== null ? { promoLabel: product.promoLabel } : {}),
    currency: product.currency as "INR",
    image: product.image,
    gallery,
    category: product.category.name,
    availability: hasActiveVariant ? "available" : "coming-soon",
    launchStatus: hasActiveVariant ? "active" : "coming-soon",
    ...(product.releaseNote !== null ? { releaseNote: product.releaseNote } : {}),
    rating: typeof product.rating === "number" ? product.rating : Number(product.rating),
    reviewCount: product.reviewCount,
    isFeatured: hasFeaturedVariant || product.isFeatured,
    isBestSeller: hasBestSellerVariant || product.isBestSeller,
    isNew: product.isNew,
    ...(product.badgeLabel !== null ? { badgeLabel: product.badgeLabel } : {}),
    popularity: product.popularity,
    ingredients: product.ingredients,
    benefits: product.benefits,
    variants: mappedVariants
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


function isPriceSort(sort: ProductListQuery["sort"]): boolean {
  return sort === "price-asc" || sort === "price-desc";
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function buildProductListWhereSql(query: ProductListQuery): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];

  if (query.category) {
    conditions.push(Prisma.sql`LOWER(c."name") = LOWER(${query.category})`);
  }

  if (query.search) {
    const searchPattern = `%${escapeLikePattern(query.search)}%`;
    conditions.push(Prisma.sql`(
      p."name" ILIKE ${searchPattern} ESCAPE '\\'
      OR p."tagline" ILIKE ${searchPattern} ESCAPE '\\'
      OR p."description" ILIKE ${searchPattern} ESCAPE '\\'
    )`);
  }

  if (typeof query.isNew === "boolean") {
    conditions.push(Prisma.sql`p."isNew" = ${query.isNew}`);
  }

  if (typeof query.featured === "boolean") {
    conditions.push(
      query.featured
        ? Prisma.sql`EXISTS (
            SELECT 1 FROM "ProductVariant" vf
            WHERE vf."productId" = p."id" AND vf."isActive" = true AND vf."isFeatured" = true AND vf."stock" > 0
          )`
        : Prisma.sql`NOT EXISTS (
            SELECT 1 FROM "ProductVariant" vf
            WHERE vf."productId" = p."id" AND vf."isActive" = true AND vf."isFeatured" = true AND vf."stock" > 0
          )`
    );
  }

  if (typeof query.bestSeller === "boolean") {
    conditions.push(
      query.bestSeller
        ? Prisma.sql`EXISTS (
            SELECT 1 FROM "ProductVariant" vb
            WHERE vb."productId" = p."id" AND vb."isActive" = true AND vb."isBestSeller" = true AND vb."stock" > 0
          )`
        : Prisma.sql`NOT EXISTS (
            SELECT 1 FROM "ProductVariant" vb
            WHERE vb."productId" = p."id" AND vb."isActive" = true AND vb."isBestSeller" = true AND vb."stock" > 0
          )`
    );
  }

  if (query.launchStatus === "coming-soon" || query.availability === "coming-soon") {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductVariant" vl
      WHERE vl."productId" = p."id" AND vl."isActive" = false
    )`);
  } else if (query.availability === "available" || query.launchStatus === "active" || query.featured === true || query.bestSeller === true) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductVariant" va
      WHERE va."productId" = p."id" AND va."isActive" = true AND va."stock" > 0
    )`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

function variantContextRankSql(context: "default" | "featured" | "bestSeller"): Prisma.Sql {
  if (context === "featured") {
    return Prisma.sql`CASE WHEN pv."isFeatured" = true AND pv."isActive" = true AND pv."stock" > 0 THEN 0 ELSE 1 END`;
  }

  if (context === "bestSeller") {
    return Prisma.sql`CASE WHEN pv."isBestSeller" = true AND pv."isActive" = true AND pv."stock" > 0 THEN 0 ELSE 1 END`;
  }

  return Prisma.sql`CASE WHEN true THEN 0 ELSE 0 END`;
}

function priceSortSql(sort: ProductListQuery["sort"]): Prisma.Sql {
  if (sort === "price-desc") {
    return Prisma.sql`COALESCE(display_variant."price", p."price") DESC`;
  }

  return Prisma.sql`COALESCE(display_variant."price", p."price") ASC`;
}

async function getPriceSortedProductIds(
  query: ProductListQuery,
  context: "default" | "featured" | "bestSeller"
): Promise<string[]> {
  const offset = (query.page - 1) * query.limit;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p."id"
    FROM "Product" p
    INNER JOIN "Category" c ON c."id" = p."categoryId"
    LEFT JOIN LATERAL (
      SELECT pv."price"
      FROM "ProductVariant" pv
      WHERE pv."productId" = p."id"
      ORDER BY
        ${variantContextRankSql(context)},
        CASE WHEN pv."isActive" = true AND pv."stock" > 0 THEN 0 WHEN pv."isActive" = true THEN 1 ELSE 2 END,
        CASE WHEN substring(LOWER(pv."label" || ' ' || pv."unit") FROM '([0-9]+(\\.[0-9]+)?)') IS NULL THEN 1 ELSE 0 END,
        substring(LOWER(pv."label" || ' ' || pv."unit") FROM '([0-9]+(\\.[0-9]+)?)')::numeric ASC NULLS LAST,
        pv."sortOrder" ASC,
        pv."price" ASC,
        pv."createdAt" ASC
      LIMIT 1
    ) display_variant ON true
    ${buildProductListWhereSql(query)}
    ORDER BY
      CASE
        WHEN EXISTS (SELECT 1 FROM "ProductVariant" vp WHERE vp."productId" = p."id" AND vp."isActive" = true AND vp."stock" > 0) THEN 0
        WHEN EXISTS (SELECT 1 FROM "ProductVariant" va WHERE va."productId" = p."id" AND va."isActive" = true) THEN 1
        ELSE 2
      END ASC,
      ${priceSortSql(query.sort)},
      p."createdAt" DESC,
      p."id" ASC
    LIMIT ${query.limit} OFFSET ${offset}
  `);

  return rows.map((row) => row.id);
}

export async function listProducts(query: ProductListQuery): Promise<ProductListResult> {
  const cacheKey = getListCacheKey(query);
  const cached = readListCache(cacheKey);
  if (cached) {
    return cached;
  }

  const variantFlagFilters: Array<Record<string, unknown>> = [];

  if (typeof query.featured === "boolean") {
    if (query.featured) {
      variantFlagFilters.push({
        variants: {
          some: {
            isActive: true,
            isFeatured: true,
            stock: {
              gt: 0
            }
          }
        }
      });
    } else {
      variantFlagFilters.push({
        variants: {
          none: {
            isActive: true,
            isFeatured: true,
            stock: {
              gt: 0
            }
          }
        }
      });
    }
  }

  if (typeof query.bestSeller === "boolean") {
    if (query.bestSeller) {
      variantFlagFilters.push({
        variants: {
          some: {
            isActive: true,
            isBestSeller: true,
            stock: {
              gt: 0
            }
          }
        }
      });
    } else {
      variantFlagFilters.push({
        variants: {
          none: {
            isActive: true,
            isBestSeller: true,
            stock: {
              gt: 0
            }
          }
        }
      });
    }
  }

  const lifecycleVariantFilter =
    query.launchStatus === "coming-soon" || query.availability === "coming-soon"
      ? { variants: { some: { isActive: false } } }
      : query.availability === "available" || query.launchStatus === "active" || query.featured === true || query.bestSeller === true
        ? { variants: { some: { isActive: true, stock: { gt: 0 } } } }
        : {};

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
    ...(typeof query.isNew === "boolean" ? { isNew: query.isNew } : {}),
    ...(variantFlagFilters.length > 0 ? { AND: variantFlagFilters } : {}),
    ...lifecycleVariantFilter
  };

  const context = query.featured ? "featured" : query.bestSeller ? "bestSeller" : "default";
  const totalPromise = prisma.product.count({ where });

  const productsPromise = isPriceSort(query.sort)
    ? getPriceSortedProductIds(query, context).then(async (productIds) => {
        if (productIds.length === 0) {
          return [];
        }

        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          include: {
            category: { select: { name: true } },
            images: { select: { url: true, position: true } },
            variants: {
              select: {
                frontendVariantId: true,
                label: true,
                price: true,
                compareAtPrice: true,
                discountPercent: true,
                unit: true,
                stock: true,
                isFeatured: true,
                isBestSeller: true,
                sortOrder: true,
                isActive: true,
                createdAt: true
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
            }
          }
        });
        const productsById = new Map(products.map((product) => [product.id, product]));
        return productIds.flatMap((productId) => {
          const product = productsById.get(productId);
          return product ? [product] : [];
        });
      })
    : prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          images: { select: { url: true, position: true } },
          variants: {
            select: {
              frontendVariantId: true,
              label: true,
              price: true,
              compareAtPrice: true,
              discountPercent: true,
              unit: true,
              stock: true,
              isFeatured: true,
              isBestSeller: true,
              sortOrder: true,
              isActive: true,
              createdAt: true
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: parseSort(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit
      });

  const [total, products] = await Promise.all([totalPromise, productsPromise]);

  const result: ProductListResult = {
    data: products.map((product) => mapProduct(product as unknown as StorefrontProductRecord, context)),
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
        select: {
          frontendVariantId: true,
          label: true,
          price: true,
          compareAtPrice: true,
          discountPercent: true,
          unit: true,
          stock: true,
          isFeatured: true,
          isBestSeller: true,
          sortOrder: true,
          isActive: true,
          createdAt: true
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  return mapProduct(product as unknown as StorefrontProductRecord);
}
