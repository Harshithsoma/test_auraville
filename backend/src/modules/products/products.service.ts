import { HttpError } from "../../utils/http-error";
import { prisma } from "../../prisma/prisma.service";
import { env } from "../../config/env";
import { NotifyDeliveryError, sendBackInStockEmail } from "../../utils/notify-delivery";
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
  if (variant.stock > 0) {
    return 0;
  }
  return 1;
}

function sortVariants(
  variants: StorefrontVariantRecord[],
  context: "default" | "featured" | "bestSeller"
): StorefrontVariantRecord[] {
  return [...variants].sort((a, b) => {
    const aFlag = context === "featured" ? a.isFeatured : context === "bestSeller" ? a.isBestSeller : true;
    const bFlag = context === "featured" ? b.isFeatured : context === "bestSeller" ? b.isBestSeller : true;
    const aFlagRank = aFlag ? 0 : 1;
    const bFlagRank = bFlag ? 0 : 1;
    if (aFlagRank !== bFlagRank) {
      return aFlagRank - bFlagRank;
    }

    const stockRankDelta = getVariantPriority(a) - getVariantPriority(b);
    if (stockRankDelta !== 0) {
      return stockRankDelta;
    }

    const sortOrderDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortOrderDelta !== 0) {
      return sortOrderDelta;
    }

    return 0;
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
    isFeatured: variant.isFeatured,
    isBestSeller: variant.isBestSeller,
    sortOrder: variant.sortOrder
  }));
  const hasFeaturedVariant = product.variants.some((variant) => variant.isFeatured && variant.stock > 0);
  const hasBestSellerVariant = product.variants.some((variant) => variant.isBestSeller && variant.stock > 0);

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
    availability: toAvailability(product.availability),
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
    ...(query.availability ? { availability: toDbAvailability(query.availability) } : {}),
    ...(variantFlagFilters.length > 0 ? { AND: variantFlagFilters } : {})
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
            compareAtPrice: true,
            discountPercent: true,
            unit: true,
            stock: true,
            isFeatured: true,
            isBestSeller: true,
            sortOrder: true,
            createdAt: true
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
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
        compareAtPrice: number | null;
        discountPercent: number;
        unit: string;
        stock: number;
        isFeatured: boolean;
        isBestSeller: boolean;
        sortOrder: number;
      }>;
    }) =>
      mapProduct({
        ...product,
        variants: product.variants.map((variant: {
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
        }) => ({
          frontendVariantId: variant.frontendVariantId,
          label: variant.label,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          discountPercent: variant.discountPercent,
          unit: variant.unit,
          stock: variant.stock,
          isFeatured: variant.isFeatured,
          isBestSeller: variant.isBestSeller,
          sortOrder: variant.sortOrder
        }))
      }, query.featured ? "featured" : query.bestSeller ? "bestSeller" : "default")
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
          compareAtPrice: true,
          discountPercent: true,
          unit: true,
          stock: true,
          isFeatured: true,
          isBestSeller: true,
          sortOrder: true,
          createdAt: true
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
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
      compareAtPrice: number | null;
      discountPercent: number;
      unit: string;
      stock: number;
      isFeatured: boolean;
      isBestSeller: boolean;
      sortOrder: number;
    }) => ({
      frontendVariantId: variant.frontendVariantId,
      label: variant.label,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      discountPercent: variant.discountPercent,
      unit: variant.unit,
      stock: variant.stock,
      isFeatured: variant.isFeatured,
      isBestSeller: variant.isBestSeller,
      sortOrder: variant.sortOrder
    }))
  });
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }

  const visiblePrefix = localPart.slice(0, 2);
  return `${visiblePrefix}${"*".repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
}

export async function registerProductNotifyRequest(params: {
  productId: string;
  user: { id: string; email: string };
}): Promise<{ message: string }> {
  const normalizedEmail = params.user.email.trim().toLowerCase();

  const product = await prisma.product.findUnique({
    where: {
      id: params.productId
    },
    select: {
      id: true,
      isActive: true,
      availability: true,
      variants: {
        where: {
          isActive: true,
          stock: {
            gt: 0
          }
        },
        select: {
          id: true
        },
        take: 1
      }
    }
  });

  if (!product || !product.isActive) {
    throw new HttpError(404, "Product not found", undefined, "PRODUCT_NOT_FOUND");
  }

  if (product.availability === "available" && product.variants.length > 0) {
    throw new HttpError(409, "Product is already in stock", undefined, "PRODUCT_ALREADY_IN_STOCK");
  }

  const existingActive = await prisma.productNotifyRequest.findUnique({
    where: {
      productId_email_isActive: {
        productId: params.productId,
        email: normalizedEmail,
        isActive: true
      }
    },
    select: {
      id: true
    }
  });

  if (existingActive) {
    return {
      message: "You're already on this waitlist. We'll notify you when it's back in stock."
    };
  }

  const existingInactive = await prisma.productNotifyRequest.findUnique({
    where: {
      productId_email_isActive: {
        productId: params.productId,
        email: normalizedEmail,
        isActive: false
      }
    },
    select: {
      id: true
    }
  });

  if (existingInactive) {
    await prisma.productNotifyRequest.update({
      where: {
        id: existingInactive.id
      },
      data: {
        isActive: true,
        userId: params.user.id,
        requestedAt: new Date(),
        notifiedAt: null
      }
    });
  } else {
    await prisma.productNotifyRequest.create({
      data: {
        productId: params.productId,
        userId: params.user.id,
        email: normalizedEmail,
        isActive: true
      }
    });
  }

  return {
    message: "You'll be notified when this product is back in stock."
  };
}

export async function dispatchBackInStockNotifications(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    },
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      isActive: true,
      availability: true,
      variants: {
        where: {
          isActive: true,
          stock: {
            gt: 0
          }
        },
        select: {
          id: true
        },
        take: 1
      }
    }
  });

  if (!product || !product.isActive || product.availability !== "available" || product.variants.length === 0) {
    return;
  }

  const pendingRequests = await prisma.productNotifyRequest.findMany({
    where: {
      productId: product.id,
      isActive: true,
      notifiedAt: null
    },
    select: {
      id: true,
      email: true
    }
  });

  if (pendingRequests.length === 0) {
    return;
  }

  const productUrl = `${env.FRONTEND_URL.replace(/\/+$/, "")}/product/${product.slug}`;

  for (const request of pendingRequests) {
    try {
      await sendBackInStockEmail({
        email: request.email,
        productName: product.name,
        productImage: product.image,
        productUrl
      });

      await prisma.productNotifyRequest.update({
        where: {
          id: request.id
        },
        data: {
          isActive: false,
          notifiedAt: new Date()
        }
      });
    } catch (error) {
      if (env.NODE_ENV !== "test") {
        const code = error instanceof NotifyDeliveryError ? error.code : "NOTIFY_SEND_FAILED";
        // eslint-disable-next-line no-console
        console.error("Back-in-stock email send failed", {
          productId: product.id,
          code,
          recipient: maskEmail(request.email)
        });
      }
    }
  }
}
