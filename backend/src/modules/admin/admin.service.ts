import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/prisma.service";
import { HttpError } from "../../utils/http-error";
import { dispatchBackInStockNotifications, invalidateProductsListCache } from "../products/products.service";
import { sendDeliveredOrderReviewRequestEmails } from "../reviews/reviews.service";
import type {
  AdminCategoryResponse,
  AdminCouponResponse,
  AdminHomepageSectionResponse,
  AdminOrderDetailResponse,
  AdminOrderSummaryResponse,
  AdminProductResponse,
  AdminReviewResponse
} from "./admin.types";
import type {
  AdminApproveReviewValidatedInput,
  AdminCreateCouponValidatedInput,
  AdminCreateCategoryValidatedInput,
  AdminCreateProductValidatedInput,
  AdminCreateVariantValidatedInput,
  AdminDeleteCouponValidatedInput,
  AdminHardDeleteCouponValidatedInput,
  AdminDeleteReviewValidatedInput,
  AdminDeleteCategoryValidatedInput,
  AdminDeleteProductValidatedInput,
  AdminHardDeleteProductValidatedInput,
  AdminDeleteVariantValidatedInput,
  AdminHardDeleteVariantValidatedInput,
  AdminGetProductByIdValidatedInput,
  AdminGetOrderByIdValidatedInput,
  AdminListCouponsValidatedInput,
  AdminListOrdersValidatedInput,
  AdminListProductsValidatedInput,
  AdminListReviewsValidatedInput,
  AdminPatchHomepageValidatedInput,
  AdminPatchCouponValidatedInput,
  AdminPatchOrderStatusValidatedInput,
  AdminPatchCategoryValidatedInput,
  AdminPatchProductValidatedInput,
  AdminPatchVariantValidatedInput
} from "./admin.validation";

type AdminProductRecord = {
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
  categoryId: string;
  availability: "available" | "coming_soon";
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  images: Array<{
    url: string;
    position: number;
  }>;
  variants: Array<{
    frontendVariantId: string;
    label: string;
    price: number;
    compareAtPrice: number | null;
    discountPercent: number;
    unit: string;
    stock: number;
    sku: string | null;
    isFeatured: boolean;
    isBestSeller: boolean;
    sortOrder: number;
    isActive: boolean;
  }>;
};

function triggerBackInStockNotifications(productId: string): void {
  void dispatchBackInStockNotifications(productId).catch((error) => {
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.error("Back-in-stock notification dispatch failed", {
        productId,
        name: error instanceof Error ? error.name : "UnknownError"
      });
    }
  });
}

async function syncLegacyProductProjection(productId: string): Promise<void> {
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: {
      price: true,
      compareAtPrice: true,
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      stock: true,
      sortOrder: true,
      createdAt: true
    }
  });

  if (variants.length === 0) {
    return;
  }

  const ordered = [...variants].sort((a, b) => {
    const aRank = a.isActive && a.stock > 0 ? 0 : a.isActive ? 1 : 2;
    const bRank = b.isActive && b.stock > 0 ? 0 : b.isActive ? 1 : 2;
    if (aRank !== bRank) return aRank - bRank;
    const sortDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortDelta !== 0) return sortDelta;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const primary = ordered[0];
  if (!primary) {
    return;
  }
  const hasFeatured = variants.some((variant) => variant.isActive && variant.stock > 0 && variant.isFeatured);
  const hasBestSeller = variants.some((variant) => variant.isActive && variant.stock > 0 && variant.isBestSeller);

  await prisma.product.update({
    where: { id: productId },
    data: {
      price: primary.price,
      compareAtPrice: toPublicCompareAtPrice(primary.compareAtPrice, primary.price),
      isFeatured: hasFeatured,
      isBestSeller: hasBestSeller
    }
  });
}

function toApiAvailability(value: "available" | "coming_soon"): "available" | "coming-soon" {
  return value === "coming_soon" ? "coming-soon" : "available";
}

function toDbAvailability(value: "available" | "coming-soon"): "available" | "coming_soon" {
  return value === "coming-soon" ? "coming_soon" : "available";
}

function mapAdminProduct(product: AdminProductRecord): AdminProductResponse {
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
    compareAtPrice: product.compareAtPrice,
    promoLabel: product.promoLabel,
    currency: "INR",
    image: product.image,
    gallery,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug
    },
    categoryId: product.categoryId,
    availability: toApiAvailability(product.availability),
    releaseNote: product.releaseNote,
    rating: typeof product.rating === "number" ? product.rating : Number(product.rating),
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNew: product.isNew,
    badgeLabel: product.badgeLabel,
    popularity: product.popularity,
    ingredients: product.ingredients,
    benefits: product.benefits,
    isActive: product.isActive,
    variants: product.variants.map((variant) => ({
      id: variant.frontendVariantId,
      label: variant.label,
      price: variant.price,
      compareAtPrice: toPublicCompareAtPrice(variant.compareAtPrice, variant.price),
      discountPercent: variant.discountPercent,
      unit: variant.unit,
      stock: variant.stock,
      sku: variant.sku,
      isFeatured: variant.isFeatured,
      isBestSeller: variant.isBestSeller,
      sortOrder: variant.sortOrder,
      isActive: variant.isActive
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

function ensureUniqueVariantIds(variantIds: string[]): void {
  const seen = new Set<string>();
  for (const variantId of variantIds) {
    if (seen.has(variantId)) {
      throw new HttpError(400, "Duplicate variant id in request", { variantId }, "VARIANT_ID_CONFLICT");
    }
    seen.add(variantId);
  }
}

function clampDiscountPercent(value: number | undefined): number {
  if (!Number.isFinite(value ?? NaN)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
}

function resolveVariantPricing(params: {
  compareAtPrice?: number | null;
  discountPercent?: number;
  price?: number;
}): { price: number; compareAtPrice: number | null; discountPercent: number } {
  const discountPercent = clampDiscountPercent(params.discountPercent);

  if (typeof params.compareAtPrice === "number" && params.compareAtPrice >= 0) {
    const compareAtPrice = Math.round(params.compareAtPrice);
    const computedPrice = Math.round(compareAtPrice * (1 - discountPercent / 100));
    return {
      price: Math.max(0, computedPrice),
      compareAtPrice,
      discountPercent
    };
  }

  if (typeof params.price === "number" && params.price >= 0) {
    const price = Math.round(params.price);
    return {
      price,
      compareAtPrice: price,
      discountPercent: 0
    };
  }

  throw new HttpError(
    400,
    "Variant requires either compareAtPrice (MRP) or price",
    undefined,
    "INVALID_VARIANT_PRICING"
  );
}

function toPublicCompareAtPrice(compareAtPrice: number | null, price: number): number | null {
  if (compareAtPrice === null || compareAtPrice <= price) {
    return null;
  }

  return compareAtPrice;
}

function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

function mapCoupon(coupon: {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AdminCouponResponse {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    discountValue: coupon.discountValue,
    minOrderValue: coupon.minOrderValue,
    maxDiscount: coupon.maxDiscount,
    startsAt: coupon.startsAt ? coupon.startsAt.toISOString() : null,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
    usageLimit: coupon.usageLimit,
    usageLimitPerUser: coupon.usageLimitPerUser,
    usedCount: coupon.usedCount,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString()
  };
}

function mapReview(review: {
  id: string;
  productId: string | null;
  userId: string | null;
  name: string;
  email: string | null;
  rating: number;
  subject: string | null;
  body: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AdminReviewResponse {
  return {
    id: review.id,
    productId: review.productId,
    userId: review.userId,
    name: review.name,
    email: review.email,
    rating: review.rating,
    subject: review.subject,
    body: review.body,
    isApproved: review.isApproved,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  };
}

function mapHomepageSection(section: {
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  metadata: unknown;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): AdminHomepageSectionResponse {
  return {
    key: section.key,
    title: section.title,
    subtitle: section.subtitle,
    body: section.body,
    imageUrl: section.imageUrl,
    linkUrl: section.linkUrl,
    metadata:
      section.metadata && typeof section.metadata === "object" && !Array.isArray(section.metadata)
        ? (section.metadata as Record<string, unknown>)
        : null,
    isActive: section.isActive,
    position: section.position,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString()
  };
}

async function ensureUniqueCouponCode(code: string, excludeId?: string): Promise<void> {
  const existing = await prisma.coupon.findFirst({
    where: {
      code,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: {
      id: true
    }
  });

  if (existing) {
    throw new HttpError(409, "Coupon code already exists", { code }, "COUPON_CODE_EXISTS");
  }
}

async function ensureCouponById(id: string): Promise<{
  id: string;
  code: string;
  type: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}> {
  const coupon = await prisma.coupon.findUnique({
    where: { id }
  });

  if (!coupon) {
    throw new HttpError(404, "Coupon not found", undefined, "COUPON_NOT_FOUND");
  }

  return coupon;
}

function validateCouponBusinessRules(params: {
  type: "PERCENT" | "FLAT";
  discountValue: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}): void {
  if (params.type === "PERCENT" && (params.discountValue < 1 || params.discountValue > 100)) {
    throw new HttpError(
      400,
      "PERCENT discount must be between 1 and 100",
      undefined,
      "INVALID_COUPON_RULE"
    );
  }

  if (params.type === "FLAT" && params.discountValue <= 0) {
    throw new HttpError(400, "FLAT discount must be positive", undefined, "INVALID_COUPON_RULE");
  }

  if (params.startsAt && params.expiresAt && params.expiresAt <= params.startsAt) {
    throw new HttpError(
      400,
      "expiresAt must be after startsAt",
      undefined,
      "INVALID_COUPON_RULE"
    );
  }
}

async function recomputeProductRating(productId: string): Promise<void> {
  const aggregate = await prisma.review.aggregate({
    where: {
      productId,
      isApproved: true
    },
    _avg: {
      rating: true
    },
    _count: {
      rating: true
    }
  });

  const nextRating = aggregate._avg.rating ?? 0;
  const nextCount = aggregate._count.rating ?? 0;

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: nextRating,
      reviewCount: nextCount
    }
  });
}

async function getReviewByIdOrThrow(id: string): Promise<{
  id: string;
  productId: string | null;
  userId: string | null;
  name: string;
  email: string | null;
  rating: number;
  subject: string | null;
  body: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}> {
  const review = await prisma.review.findUnique({
    where: { id }
  });

  if (!review) {
    throw new HttpError(404, "Review not found", undefined, "REVIEW_NOT_FOUND");
  }

  return review;
}

async function ensureCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });

  if (!category) {
    throw new HttpError(404, "Category not found", undefined, "CATEGORY_NOT_FOUND");
  }
}

async function ensureUniqueProductSlug(slug: string, excludeId?: string): Promise<void> {
  const existing = await prisma.product.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true }
  });

  if (existing) {
    throw new HttpError(409, "Product slug already exists", { slug }, "SLUG_ALREADY_EXISTS");
  }
}

async function ensureUniqueCategorySlug(slug: string, excludeId?: string): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true }
  });

  if (existing) {
    throw new HttpError(409, "Category slug already exists", { slug }, "SLUG_ALREADY_EXISTS");
  }
}

async function generateUniqueProductIdFromSlug(slug: string): Promise<string> {
  const base = slug.trim();
  if (!base) {
    return `product-${Date.now()}`;
  }

  let nextId = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { id: nextId },
      select: { id: true }
    });

    if (!existing) {
      return nextId;
    }

    nextId = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function getAdminProductRecordById(id: string): Promise<AdminProductRecord> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      images: {
        select: {
          url: true,
          position: true
        }
      },
      variants: {
        select: {
          frontendVariantId: true,
          label: true,
          price: true,
          compareAtPrice: true,
          discountPercent: true,
          unit: true,
          stock: true,
          sku: true,
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
    throw new HttpError(404, "Product not found", undefined, "PRODUCT_NOT_FOUND");
  }

  return product as AdminProductRecord;
}

export async function adminListProducts(
  query: AdminListProductsValidatedInput["query"]
): Promise<{
  data: AdminProductResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { id: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
      { tagline: { contains: query.search, mode: "insensitive" } }
    ];
  }

  if (query.category) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { categoryId: query.category },
          { category: { slug: { equals: query.category, mode: "insensitive" } } },
          { category: { name: { equals: query.category, mode: "insensitive" } } }
        ]
      }
    ];
  }

  if (query.availability) {
    where.availability = toDbAvailability(query.availability);
  }

  if (typeof query.isActive === "boolean") where.isActive = query.isActive;
  if (typeof query.isFeatured === "boolean") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      query.isFeatured
        ? {
            variants: {
              some: {
                isActive: true,
                isFeatured: true,
                stock: {
                  gt: 0
                }
              }
            }
          }
        : {
            variants: {
              none: {
                isActive: true,
                isFeatured: true,
                stock: {
                  gt: 0
                }
              }
            }
          }
    ];
  }

  if (typeof query.isBestSeller === "boolean") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      query.isBestSeller
        ? {
            variants: {
              some: {
                isActive: true,
                isBestSeller: true,
                stock: {
                  gt: 0
                }
              }
            }
          }
        : {
            variants: {
              none: {
                isActive: true,
                isBestSeller: true,
                stock: {
                  gt: 0
                }
              }
            }
          }
    ];
  }
  if (typeof query.isNew === "boolean") where.isNew = query.isNew;

  const [total, products] = await Promise.all([
    prisma.product.count({ where: where as never }),
    prisma.product.findMany({
      where: where as never,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        images: {
          select: {
            url: true,
            position: true
          }
        },
        variants: {
          select: {
            frontendVariantId: true,
            label: true,
            price: true,
            compareAtPrice: true,
            discountPercent: true,
            unit: true,
            stock: true,
            sku: true,
            isFeatured: true,
            isBestSeller: true,
            sortOrder: true,
            isActive: true,
            createdAt: true
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  return {
    data: products.map((product) => mapAdminProduct(product as AdminProductRecord)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
    }
  };
}

export async function adminGetProductById(
  params: AdminGetProductByIdValidatedInput["params"]
): Promise<{ data: AdminProductResponse }> {
  const product = await getAdminProductRecordById(params.id);
  return { data: mapAdminProduct(product) };
}

export async function adminCreateProduct(
  payload: AdminCreateProductValidatedInput["body"]
): Promise<{ data: AdminProductResponse }> {
  await ensureCategoryExists(payload.categoryId);
  await ensureUniqueProductSlug(payload.slug);

  const variantPayload = payload.variants ?? [];
  ensureUniqueVariantIds(variantPayload.map((variant) => variant.frontendVariantId));

  if (variantPayload.length > 0) {
    for (const variant of variantPayload) {
      if (variant.sku) {
        const existingSku = await prisma.productVariant.findFirst({
          where: {
            sku: variant.sku
          },
          select: { id: true }
        });

        if (existingSku) {
          throw new HttpError(409, "Variant SKU already exists", { sku: variant.sku }, "SKU_CONFLICT");
        }
      }
    }
  }

  const normalizedVariants = variantPayload.map((variant, index) => {
    const pricing = resolveVariantPricing({
      compareAtPrice: variant.compareAtPrice,
      discountPercent: variant.discountPercent,
      price: variant.price
    });

    return {
      frontendVariantId: variant.frontendVariantId,
      label: variant.label,
      price: pricing.price,
      compareAtPrice: pricing.compareAtPrice,
      discountPercent: pricing.discountPercent,
      unit: variant.unit,
      stock: variant.stock,
      sku: variant.sku,
      isFeatured: variant.isFeatured ?? false,
      isBestSeller: variant.isBestSeller ?? false,
      sortOrder: variant.sortOrder ?? index,
      isActive: variant.isActive ?? true
    };
  });

  if (normalizedVariants.length === 0 && payload.price === undefined) {
    throw new HttpError(
      400,
      "At least one variant or a fallback product price is required",
      undefined,
      "PRODUCT_PRICE_REQUIRED"
    );
  }

  const preferredVariantIndex = normalizedVariants.findIndex((variant) => variant.isActive && variant.stock > 0);
  const fallbackVariantIndex =
    preferredVariantIndex >= 0 ? preferredVariantIndex : normalizedVariants.findIndex((variant) => variant.isActive);
  const selectedVariantIndex = fallbackVariantIndex >= 0 ? fallbackVariantIndex : 0;
  const selectedVariant = normalizedVariants[selectedVariantIndex];

  if (
    payload.isFeatured &&
    normalizedVariants.length > 0 &&
    selectedVariant &&
    !normalizedVariants.some((variant) => variant.isFeatured)
  ) {
    selectedVariant.isFeatured = true;
  }
  if (
    payload.isBestSeller &&
    normalizedVariants.length > 0 &&
    selectedVariant &&
    !normalizedVariants.some((variant) => variant.isBestSeller)
  ) {
    selectedVariant.isBestSeller = true;
  }

  const primaryVariant = normalizedVariants
    .slice()
    .sort((a, b) => {
      const aRank = a.isActive && a.stock > 0 ? 0 : a.isActive ? 1 : 2;
      const bRank = b.isActive && b.stock > 0 ? 0 : b.isActive ? 1 : 2;
      if (aRank !== bRank) return aRank - bRank;
      return a.sortOrder - b.sortOrder;
    })[0];

  const gallery = payload.gallery && payload.gallery.length > 0 ? payload.gallery : [payload.image];
  const productId = payload.id?.trim()
    ? payload.id.trim()
    : await generateUniqueProductIdFromSlug(payload.slug);

  const derivedProductPrice = primaryVariant?.price ?? payload.price ?? 0;
  const derivedProductCompareAt =
    toPublicCompareAtPrice(primaryVariant?.compareAtPrice ?? null, derivedProductPrice) ??
    toPublicCompareAtPrice(payload.compareAtPrice ?? null, derivedProductPrice);
  const hasFeaturedVariant = normalizedVariants.some(
    (variant) => variant.isActive && variant.stock > 0 && variant.isFeatured
  );
  const hasBestSellerVariant = normalizedVariants.some(
    (variant) => variant.isActive && variant.stock > 0 && variant.isBestSeller
  );

  await prisma.product.create({
    data: {
      id: productId,
      slug: payload.slug,
      name: payload.name,
      tagline: payload.tagline,
      description: payload.description,
      longDescription: payload.longDescription,
      price: derivedProductPrice,
      compareAtPrice: derivedProductCompareAt,
      promoLabel: payload.promoLabel ?? null,
      currency: payload.currency ?? "INR",
      image: payload.image,
      categoryId: payload.categoryId,
      availability: toDbAvailability(payload.availability),
      releaseNote: payload.releaseNote ?? null,
      rating: payload.rating ?? 0,
      reviewCount: payload.reviewCount ?? 0,
      isFeatured: hasFeaturedVariant || (payload.isFeatured ?? false),
      isBestSeller: hasBestSellerVariant || (payload.isBestSeller ?? false),
      isNew: payload.isNew ?? false,
      badgeLabel: payload.badgeLabel ?? null,
      popularity: payload.popularity ?? 0,
      ingredients: payload.ingredients ?? [],
      benefits: payload.benefits ?? [],
      isActive: payload.isActive ?? true,
      images: {
        create: gallery.map((url, index) => ({
          url,
          position: index,
          alt: `${payload.name} image ${index + 1}`
        }))
      },
      variants: {
        create: normalizedVariants.map((variant) => ({
          frontendVariantId: variant.frontendVariantId,
          label: variant.label,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          discountPercent: variant.discountPercent,
          unit: variant.unit,
          stock: variant.stock,
          sku: variant.sku,
          isFeatured: variant.isFeatured,
          isBestSeller: variant.isBestSeller,
          sortOrder: variant.sortOrder,
          isActive: variant.isActive ?? true
        }))
      }
    }
  });
  await syncLegacyProductProjection(productId);
  invalidateProductsListCache();

  const created = await getAdminProductRecordById(productId);
  return { data: mapAdminProduct(created) };
}

export async function adminPatchProduct(params: {
  route: AdminPatchProductValidatedInput["params"];
  payload: AdminPatchProductValidatedInput["body"];
}): Promise<{ data: AdminProductResponse }> {
  const { route, payload } = params;

  await getAdminProductRecordById(route.id);

  if (payload.slug) {
    await ensureUniqueProductSlug(payload.slug, route.id);
  }

  if (payload.categoryId) {
    await ensureCategoryExists(payload.categoryId);
  }

  const data: Record<string, unknown> = {};

  if (payload.slug !== undefined) data.slug = payload.slug;
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.tagline !== undefined) data.tagline = payload.tagline;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.longDescription !== undefined) data.longDescription = payload.longDescription;
  if (payload.price !== undefined) data.price = payload.price;
  if (payload.compareAtPrice !== undefined) data.compareAtPrice = payload.compareAtPrice;
  if (payload.promoLabel !== undefined) data.promoLabel = payload.promoLabel;
  if (payload.currency !== undefined) data.currency = payload.currency;
  if (payload.image !== undefined) data.image = payload.image;
  if (payload.categoryId !== undefined) data.categoryId = payload.categoryId;
  if (payload.availability !== undefined) data.availability = toDbAvailability(payload.availability);
  if (payload.releaseNote !== undefined) data.releaseNote = payload.releaseNote;
  if (payload.rating !== undefined) data.rating = payload.rating;
  if (payload.reviewCount !== undefined) data.reviewCount = payload.reviewCount;
  if (payload.isFeatured !== undefined) data.isFeatured = payload.isFeatured;
  if (payload.isBestSeller !== undefined) data.isBestSeller = payload.isBestSeller;
  if (payload.isNew !== undefined) data.isNew = payload.isNew;
  if (payload.badgeLabel !== undefined) data.badgeLabel = payload.badgeLabel;
  if (payload.popularity !== undefined) data.popularity = payload.popularity;
  if (payload.ingredients !== undefined) data.ingredients = payload.ingredients;
  if (payload.benefits !== undefined) data.benefits = payload.benefits;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;

  await prisma.$transaction(async (tx: any) => {
    await tx.product.update({
      where: { id: route.id },
      data
    });

    if (payload.gallery) {
      const current = await tx.product.findUnique({
        where: { id: route.id },
        select: { name: true }
      });

      await tx.productImage.deleteMany({
        where: { productId: route.id }
      });

      await tx.productImage.createMany({
        data: payload.gallery.map((url, index) => ({
          productId: route.id,
          url,
          position: index,
          alt: `${(current?.name ?? "Product").trim()} image ${index + 1}`
        }))
      });
    }
  });
  await syncLegacyProductProjection(route.id);
  invalidateProductsListCache();

  const updated = await getAdminProductRecordById(route.id);
  return { data: mapAdminProduct(updated) };
}

export async function adminSoftDeleteProduct(
  params: AdminDeleteProductValidatedInput["params"]
): Promise<{ data: { id: string; isActive: boolean } }> {
  await getAdminProductRecordById(params.id);

  await prisma.product.update({
    where: { id: params.id },
    data: {
      isActive: false
    }
  });
  invalidateProductsListCache();

  return {
    data: {
      id: params.id,
      isActive: false
    }
  };
}

export async function adminHardDeleteProduct(params: {
  route: AdminHardDeleteProductValidatedInput["params"];
  payload: AdminHardDeleteProductValidatedInput["body"];
}): Promise<{ data: { id: string; deleted: true } }> {
  const { route, payload } = params;
  const product = await getAdminProductRecordById(route.id);

  if (payload.confirmText.trim() !== product.name.trim()) {
    throw new HttpError(
      400,
      "Confirmation text does not match product name.",
      undefined,
      "DELETE_CONFIRMATION_MISMATCH"
    );
  }

  const [orderItemCount, verifiedReviewCount, activeNotifyCount, reviewTokenCount] = await Promise.all([
    prisma.orderItem.count({
      where: {
        productId: route.id
      }
    }),
    prisma.review.count({
      where: {
        productId: route.id,
        isVerifiedPurchase: true
      }
    }),
    prisma.productNotifyRequest.count({
      where: {
        productId: route.id,
        isActive: true
      }
    }),
    prisma.reviewRequestToken.count({
      where: {
        productId: route.id
      }
    })
  ]);

  if (orderItemCount > 0 || verifiedReviewCount > 0 || reviewTokenCount > 0) {
    throw new HttpError(
      409,
      "Cannot permanently delete product because historical orders exist. Deactivate instead.",
      undefined,
      "PRODUCT_DELETE_BLOCKED_HISTORY"
    );
  }

  if (activeNotifyCount > 0) {
    throw new HttpError(
      409,
      "Cannot permanently delete product while active Notify Me requests exist. Deactivate instead.",
      undefined,
      "PRODUCT_DELETE_BLOCKED_NOTIFY"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.productNotifyRequest.deleteMany({
      where: {
        productId: route.id
      }
    });

    await tx.review.deleteMany({
      where: {
        productId: route.id
      }
    });

    await tx.productImage.deleteMany({
      where: {
        productId: route.id
      }
    });

    await tx.productVariant.deleteMany({
      where: {
        productId: route.id
      }
    });

    await tx.product.delete({
      where: {
        id: route.id
      }
    });
  });

  invalidateProductsListCache();

  return {
    data: {
      id: route.id,
      deleted: true
    }
  };
}

export async function adminCreateVariant(params: {
  route: AdminCreateVariantValidatedInput["params"];
  payload: AdminCreateVariantValidatedInput["body"];
}): Promise<{ data: { id: string; label: string; price: number; compareAtPrice: number | null; discountPercent: number; unit: string; stock: number; sku: string | null; isFeatured: boolean; isBestSeller: boolean; sortOrder: number; isActive: boolean } }> {
  const { route, payload } = params;

  await getAdminProductRecordById(route.id);

  const existing = await prisma.productVariant.findUnique({
    where: {
      productId_frontendVariantId: {
        productId: route.id,
        frontendVariantId: payload.frontendVariantId
      }
    },
    select: { id: true }
  });

  if (existing) {
    throw new HttpError(
      409,
      "Variant id already exists for this product",
      { variantId: payload.frontendVariantId },
      "VARIANT_ID_CONFLICT"
    );
  }

  if (payload.sku) {
    const existingSku = await prisma.productVariant.findFirst({
      where: {
        sku: payload.sku
      },
      select: { id: true }
    });

    if (existingSku) {
      throw new HttpError(409, "Variant SKU already exists", { sku: payload.sku }, "SKU_CONFLICT");
    }
  }

  const pricing = resolveVariantPricing({
    compareAtPrice: payload.compareAtPrice,
    discountPercent: payload.discountPercent,
    price: payload.price
  });

  const created = await prisma.productVariant.create({
    data: {
      productId: route.id,
      frontendVariantId: payload.frontendVariantId,
      label: payload.label,
      price: pricing.price,
      compareAtPrice: pricing.compareAtPrice,
      discountPercent: pricing.discountPercent,
      unit: payload.unit,
      stock: payload.stock,
      sku: payload.sku,
      isFeatured: payload.isFeatured ?? false,
      isBestSeller: payload.isBestSeller ?? false,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true
    },
    select: {
      frontendVariantId: true,
      label: true,
      price: true,
      compareAtPrice: true,
      discountPercent: true,
      unit: true,
      stock: true,
      sku: true,
      isFeatured: true,
      isBestSeller: true,
      sortOrder: true,
      isActive: true
    }
  });
  await syncLegacyProductProjection(route.id);
  invalidateProductsListCache();
  if (created.isActive && created.stock > 0) {
    triggerBackInStockNotifications(route.id);
  }

  return {
    data: {
      id: created.frontendVariantId,
      label: created.label,
      price: created.price,
      compareAtPrice: toPublicCompareAtPrice(created.compareAtPrice, created.price),
      discountPercent: created.discountPercent,
      unit: created.unit,
      stock: created.stock,
      sku: created.sku,
      isFeatured: created.isFeatured,
      isBestSeller: created.isBestSeller,
      sortOrder: created.sortOrder,
      isActive: created.isActive
    }
  };
}

export async function adminPatchVariant(params: {
  route: AdminPatchVariantValidatedInput["params"];
  payload: AdminPatchVariantValidatedInput["body"];
}): Promise<{ data: { id: string; label: string; price: number; compareAtPrice: number | null; discountPercent: number; unit: string; stock: number; sku: string | null; isFeatured: boolean; isBestSeller: boolean; sortOrder: number; isActive: boolean } }> {
  const { route, payload } = params;

  await getAdminProductRecordById(route.id);

  const variant = await prisma.productVariant.findUnique({
    where: {
      productId_frontendVariantId: {
        productId: route.id,
        frontendVariantId: route.variantId
      }
    },
    select: {
      id: true,
      frontendVariantId: true,
      stock: true,
      isActive: true,
      compareAtPrice: true,
      discountPercent: true,
      price: true
    }
  });

  if (!variant) {
    throw new HttpError(404, "Variant not found", undefined, "VARIANT_NOT_FOUND");
  }

  if (payload.frontendVariantId && payload.frontendVariantId !== route.variantId) {
    const duplicate = await prisma.productVariant.findUnique({
      where: {
        productId_frontendVariantId: {
          productId: route.id,
          frontendVariantId: payload.frontendVariantId
        }
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new HttpError(
        409,
        "Variant id already exists for this product",
        { variantId: payload.frontendVariantId },
        "VARIANT_ID_CONFLICT"
      );
    }
  }

  if (payload.sku) {
    const duplicateSku = await prisma.productVariant.findFirst({
      where: {
        sku: payload.sku,
        id: {
          not: variant.id
        }
      },
      select: { id: true }
    });

    if (duplicateSku) {
      throw new HttpError(409, "Variant SKU already exists", { sku: payload.sku }, "SKU_CONFLICT");
    }
  }

  let resolvedPrice = variant.price;
  let resolvedCompareAt = variant.compareAtPrice;
  let resolvedDiscount = variant.discountPercent;

  if (
    payload.compareAtPrice !== undefined ||
    payload.discountPercent !== undefined ||
    payload.price !== undefined
  ) {
    const resolved = resolveVariantPricing({
      compareAtPrice:
        payload.compareAtPrice !== undefined ? payload.compareAtPrice : variant.compareAtPrice,
      discountPercent:
        payload.discountPercent !== undefined ? payload.discountPercent : variant.discountPercent,
      price: payload.price !== undefined ? payload.price : variant.price
    });
    resolvedPrice = resolved.price;
    resolvedCompareAt = resolved.compareAtPrice;
    resolvedDiscount = resolved.discountPercent;
  }

  const updated = await prisma.productVariant.update({
    where: { id: variant.id },
    data: {
      ...(payload.frontendVariantId !== undefined ? { frontendVariantId: payload.frontendVariantId } : {}),
      ...(payload.label !== undefined ? { label: payload.label } : {}),
      ...(payload.compareAtPrice !== undefined || payload.discountPercent !== undefined || payload.price !== undefined
        ? {
            price: resolvedPrice,
            compareAtPrice: resolvedCompareAt,
            discountPercent: resolvedDiscount
          }
        : {}),
      ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
      ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
      ...(payload.sku !== undefined ? { sku: payload.sku } : {}),
      ...(payload.isFeatured !== undefined ? { isFeatured: payload.isFeatured } : {}),
      ...(payload.isBestSeller !== undefined ? { isBestSeller: payload.isBestSeller } : {}),
      ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
    },
    select: {
      frontendVariantId: true,
      label: true,
      price: true,
      compareAtPrice: true,
      discountPercent: true,
      unit: true,
      stock: true,
      sku: true,
      isFeatured: true,
      isBestSeller: true,
      sortOrder: true,
      isActive: true
    }
  });
  await syncLegacyProductProjection(route.id);
  invalidateProductsListCache();
  if (updated.isActive && updated.stock > 0) {
    triggerBackInStockNotifications(route.id);
  }

  return {
    data: {
      id: updated.frontendVariantId,
      label: updated.label,
      price: updated.price,
      compareAtPrice: toPublicCompareAtPrice(updated.compareAtPrice, updated.price),
      discountPercent: updated.discountPercent,
      unit: updated.unit,
      stock: updated.stock,
      sku: updated.sku,
      isFeatured: updated.isFeatured,
      isBestSeller: updated.isBestSeller,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive
    }
  };
}

export async function adminSoftDeleteVariant(params: {
  route: AdminDeleteVariantValidatedInput["params"];
}): Promise<{ data: { id: string; isActive: boolean } }> {
  const { route } = params;

  await getAdminProductRecordById(route.id);

  const variant = await prisma.productVariant.findUnique({
    where: {
      productId_frontendVariantId: {
        productId: route.id,
        frontendVariantId: route.variantId
      }
    },
    select: {
      id: true,
      frontendVariantId: true
    }
  });

  if (!variant) {
    throw new HttpError(404, "Variant not found", undefined, "VARIANT_NOT_FOUND");
  }

  await prisma.productVariant.update({
    where: { id: variant.id },
    data: {
      isActive: false
    }
  });
  await syncLegacyProductProjection(route.id);
  invalidateProductsListCache();

  return {
    data: {
      id: variant.frontendVariantId,
      isActive: false
    }
  };
}

export async function adminHardDeleteVariant(params: {
  route: AdminHardDeleteVariantValidatedInput["params"];
  payload: AdminHardDeleteVariantValidatedInput["body"];
}): Promise<{ data: { id: string; deleted: true } }> {
  const { route, payload } = params;

  await getAdminProductRecordById(route.id);

  const variant = await prisma.productVariant.findUnique({
    where: {
      productId_frontendVariantId: {
        productId: route.id,
        frontendVariantId: route.variantId
      }
    },
    select: {
      id: true,
      frontendVariantId: true,
      label: true,
      isFeatured: true,
      isBestSeller: true
    }
  });

  if (!variant) {
    throw new HttpError(404, "Variant not found", undefined, "VARIANT_NOT_FOUND");
  }

  if (payload.confirmText.trim() !== variant.label.trim()) {
    throw new HttpError(
      400,
      "Confirmation text does not match variant label.",
      undefined,
      "DELETE_CONFIRMATION_MISMATCH"
    );
  }

  const orderItemCount = await prisma.orderItem.count({
    where: {
      variantDbId: variant.id
    }
  });

  if (orderItemCount > 0) {
    throw new HttpError(
      409,
      "Variant cannot be permanently deleted because historical records exist. Deactivate instead.",
      undefined,
      "VARIANT_DELETE_BLOCKED_HISTORY"
    );
  }

  if (variant.isFeatured || variant.isBestSeller) {
    const [otherFeaturedCount, otherBestSellerCount] = await Promise.all([
      variant.isFeatured
        ? prisma.productVariant.count({
            where: {
              productId: route.id,
              id: {
                not: variant.id
              },
              isActive: true,
              isFeatured: true,
              stock: {
                gt: 0
              }
            }
          })
        : Promise.resolve(1),
      variant.isBestSeller
        ? prisma.productVariant.count({
            where: {
              productId: route.id,
              id: {
                not: variant.id
              },
              isActive: true,
              isBestSeller: true,
              stock: {
                gt: 0
              }
            }
          })
        : Promise.resolve(1)
    ]);

    if (variant.isFeatured && otherFeaturedCount === 0) {
      throw new HttpError(
        409,
        "Variant cannot be permanently deleted because it is the only active in-stock featured variant.",
        undefined,
        "VARIANT_DELETE_BLOCKED_FEATURED"
      );
    }

    if (variant.isBestSeller && otherBestSellerCount === 0) {
      throw new HttpError(
        409,
        "Variant cannot be permanently deleted because it is the only active in-stock best-seller variant.",
        undefined,
        "VARIANT_DELETE_BLOCKED_BESTSELLER"
      );
    }
  }

  await prisma.productVariant.delete({
    where: {
      id: variant.id
    }
  });

  await syncLegacyProductProjection(route.id);
  invalidateProductsListCache();

  return {
    data: {
      id: variant.frontendVariantId,
      deleted: true
    }
  };
}

export async function adminListCategories(): Promise<{ data: AdminCategoryResponse[] }> {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  const activeCounts = await Promise.all(
    categories.map(async (category) => {
      const activeProductCount = await prisma.product.count({
        where: {
          categoryId: category.id,
          isActive: true
        }
      });

      return {
        categoryId: category.id,
        activeProductCount
      };
    })
  );

  const activeCountMap = new Map(activeCounts.map((item) => [item.categoryId, item.activeProductCount]));

  return {
    data: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      productCount: category._count.products,
      activeProductCount: activeCountMap.get(category.id) ?? 0,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    }))
  };
}

export async function adminCreateCategory(
  payload: AdminCreateCategoryValidatedInput["body"]
): Promise<{ data: AdminCategoryResponse }> {
  await ensureUniqueCategorySlug(payload.slug);

  const created = await prisma.category.create({
    data: {
      name: payload.name,
      slug: payload.slug
    }
  });

  return {
    data: {
      id: created.id,
      name: created.name,
      slug: created.slug,
      productCount: 0,
      activeProductCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }
  };
}

export async function adminPatchCategory(params: {
  route: AdminPatchCategoryValidatedInput["params"];
  payload: AdminPatchCategoryValidatedInput["body"];
}): Promise<{ data: AdminCategoryResponse }> {
  const { route, payload } = params;

  const existing = await prisma.category.findUnique({
    where: { id: route.id },
    select: {
      id: true
    }
  });

  if (!existing) {
    throw new HttpError(404, "Category not found", undefined, "CATEGORY_NOT_FOUND");
  }

  if (payload.slug) {
    await ensureUniqueCategorySlug(payload.slug, route.id);
  }

  const updated = await prisma.category.update({
    where: { id: route.id },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.slug !== undefined ? { slug: payload.slug } : {})
    },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  const activeProductCount = await prisma.product.count({
    where: {
      categoryId: updated.id,
      isActive: true
    }
  });

  return {
    data: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      productCount: updated._count.products,
      activeProductCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    }
  };
}

export async function adminDeleteCategory(
  params: AdminDeleteCategoryValidatedInput["params"]
): Promise<{ data: { id: string; deleted: true } }> {
  const category = await prisma.category.findUnique({
    where: { id: params.id },
    select: {
      id: true
    }
  });

  if (!category) {
    throw new HttpError(404, "Category not found", undefined, "CATEGORY_NOT_FOUND");
  }

  const activeProductsCount = await prisma.product.count({
    where: {
      categoryId: params.id,
      isActive: true
    }
  });

  if (activeProductsCount > 0) {
    throw new HttpError(
      400,
      "Cannot delete category with active products",
      { categoryId: params.id, activeProductsCount },
      "CATEGORY_IN_USE"
    );
  }

  const totalProductsCount = await prisma.product.count({
    where: {
      categoryId: params.id
    }
  });

  if (totalProductsCount > 0) {
    throw new HttpError(
      400,
      "Cannot delete category with existing products",
      { categoryId: params.id, totalProductsCount },
      "CATEGORY_IN_USE"
    );
  }

  await prisma.category.delete({
    where: {
      id: params.id
    }
  });

  return {
    data: {
      id: params.id,
      deleted: true
    }
  };
}

export async function adminListCoupons(
  query: AdminListCouponsValidatedInput["query"]
): Promise<{
  data: AdminCouponResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const where = {
    ...(query.search
      ? {
          code: {
            contains: query.search.toUpperCase(),
            mode: "insensitive" as const
          }
        }
      : {}),
    ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {})
  };

  const [total, coupons] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  return {
    data: coupons.map((coupon) => mapCoupon(coupon)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
    }
  };
}

export async function adminCreateCoupon(
  payload: AdminCreateCouponValidatedInput["body"]
): Promise<{ data: AdminCouponResponse }> {
  const normalizedCode = normalizeCouponCode(payload.code);
  await ensureUniqueCouponCode(normalizedCode);

  validateCouponBusinessRules({
    type: payload.type,
    discountValue: payload.discountValue,
    startsAt: payload.startsAt,
    expiresAt: payload.expiresAt
  });

  const created = await prisma.coupon.create({
    data: {
      code: normalizedCode,
      description: payload.description ?? null,
      type: payload.type,
      discountValue: payload.discountValue,
      minOrderValue: payload.minOrderValue ?? null,
      maxDiscount: payload.maxDiscount ?? null,
      startsAt: payload.startsAt ?? null,
      expiresAt: payload.expiresAt ?? null,
      usageLimit: payload.usageLimit ?? null,
      usageLimitPerUser: payload.usageLimitPerUser ?? null,
      isActive: payload.isActive ?? true
    }
  });

  return { data: mapCoupon(created) };
}

export async function adminPatchCoupon(params: {
  route: AdminPatchCouponValidatedInput["params"];
  payload: AdminPatchCouponValidatedInput["body"];
}): Promise<{ data: AdminCouponResponse }> {
  const { route, payload } = params;
  const existing = await ensureCouponById(route.id);

  const nextType = payload.type ?? existing.type;
  const nextDiscountValue = payload.discountValue ?? existing.discountValue;
  const nextStartsAt = payload.startsAt !== undefined ? payload.startsAt : existing.startsAt;
  const nextExpiresAt = payload.expiresAt !== undefined ? payload.expiresAt : existing.expiresAt;

  validateCouponBusinessRules({
    type: nextType,
    discountValue: nextDiscountValue,
    startsAt: nextStartsAt,
    expiresAt: nextExpiresAt
  });

  const updateData: Record<string, unknown> = {
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.type !== undefined ? { type: payload.type } : {}),
    ...(payload.discountValue !== undefined ? { discountValue: payload.discountValue } : {}),
    ...(payload.minOrderValue !== undefined ? { minOrderValue: payload.minOrderValue } : {}),
    ...(payload.maxDiscount !== undefined ? { maxDiscount: payload.maxDiscount } : {}),
    ...(payload.startsAt !== undefined ? { startsAt: payload.startsAt } : {}),
    ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {}),
    ...(payload.usageLimit !== undefined ? { usageLimit: payload.usageLimit } : {}),
    ...(payload.usageLimitPerUser !== undefined
      ? { usageLimitPerUser: payload.usageLimitPerUser }
      : {}),
    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
  };

  if (payload.code !== undefined) {
    const normalizedCode = normalizeCouponCode(payload.code);
    await ensureUniqueCouponCode(normalizedCode, route.id);
    updateData.code = normalizedCode;
  }

  const updated = await prisma.coupon.update({
    where: { id: route.id },
    data: updateData
  });

  return {
    data: mapCoupon(updated)
  };
}

export async function adminDeleteCoupon(
  params: AdminDeleteCouponValidatedInput["params"]
): Promise<{ data: { id: string; isActive: boolean } }> {
  await ensureCouponById(params.id);

  await prisma.coupon.update({
    where: { id: params.id },
    data: {
      isActive: false
    }
  });

  return {
    data: {
      id: params.id,
      isActive: false
    }
  };
}

export async function adminHardDeleteCoupon(
  params: AdminHardDeleteCouponValidatedInput["params"]
): Promise<{ data: { id: string; deleted: boolean } }> {
  await ensureCouponById(params.id);

  const usageCount = await prisma.couponUsage.count({
    where: { couponId: params.id }
  });

  if (usageCount > 0) {
    throw new HttpError(
      400,
      "Cannot permanently delete coupon with historical usage. Disable it instead.",
      { couponId: params.id, usageCount },
      "COUPON_DELETE_BLOCKED_HISTORY"
    );
  }

  await prisma.coupon.delete({
    where: { id: params.id }
  });

  return {
    data: {
      id: params.id,
      deleted: true
    }
  };
}

export async function adminListReviews(
  query: AdminListReviewsValidatedInput["query"]
): Promise<{
  data: AdminReviewResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const where = {
    ...(typeof query.isApproved === "boolean" ? { isApproved: query.isApproved } : {}),
    ...(query.productId ? { productId: query.productId } : {})
  };

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  return {
    data: reviews.map((review) => mapReview(review)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
    }
  };
}

export async function adminApproveReview(
  params: AdminApproveReviewValidatedInput["params"]
): Promise<{ data: AdminReviewResponse }> {
  const review = await getReviewByIdOrThrow(params.id);

  const approved = await prisma.review.update({
    where: { id: review.id },
    data: {
      isApproved: true
    }
  });

  if (approved.productId) {
    await recomputeProductRating(approved.productId);
  }

  return {
    data: mapReview(approved)
  };
}

export async function adminDeleteReview(
  params: AdminDeleteReviewValidatedInput["params"]
): Promise<{ data: { id: string; deleted: true } }> {
  const review = await getReviewByIdOrThrow(params.id);
  const productId = review.productId;

  await prisma.review.delete({
    where: { id: review.id }
  });

  if (productId) {
    await recomputeProductRating(productId);
  }

  return {
    data: {
      id: params.id,
      deleted: true
    }
  };
}

type AdminOrderRecord = {
  id: string;
  userId: string | null;
  email: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  pincode: string;
  country: string;
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  gst: number;
  shipping: number;
  total: number;
  status: "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "payment_failed";
  createdAt: Date;
  payment: {
    status: "created" | "paid" | "failed" | "refunded";
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    amount: number;
    currency: string;
  } | null;
  items?: Array<{
    productId: string;
    variantId: string;
    slug: string;
    name: string;
    image: string;
    variantLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
};

function mapAdminOrderSummary(order: AdminOrderRecord): AdminOrderSummaryResponse {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    customer: {
      userId: order.userId,
      name: order.name,
      email: order.email,
      phone: order.phone
    },
    pricing: {
      subtotal: order.subtotal,
      promoDiscount: order.couponDiscount,
      gst: order.gst,
      shipping: order.shipping,
      total: order.total
    },
    payment: {
      status: order.payment?.status ?? null,
      razorpayOrderId: order.payment?.razorpayOrderId ?? null,
      razorpayPaymentId: order.payment?.razorpayPaymentId ?? null,
      amount: order.payment?.amount ?? null,
      currency: order.payment?.currency ?? null
    }
  };
}

function assertOrderStatusTransition(params: {
  from: AdminOrderRecord["status"];
  to: AdminPatchOrderStatusValidatedInput["body"]["status"];
}): void {
  const { from, to } = params;
  if (from === to) return;

  if (from === "delivered" && (to === "pending" || to === "confirmed")) {
    throw new HttpError(400, "Unsafe status transition", { from, to }, "INVALID_STATUS_TRANSITION");
  }

  if (from === "cancelled" && (to === "shipped" || to === "delivered")) {
    throw new HttpError(400, "Unsafe status transition", { from, to }, "INVALID_STATUS_TRANSITION");
  }

  if (from === "payment_failed" && (to === "shipped" || to === "delivered")) {
    throw new HttpError(400, "Unsafe status transition", { from, to }, "INVALID_STATUS_TRANSITION");
  }
}

export async function adminListOrders(
  query: AdminListOrdersValidatedInput["query"]
): Promise<{
  data: AdminOrderSummaryResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.email
      ? {
          email: {
            contains: query.email,
            mode: "insensitive" as const
          }
        }
      : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {})
          }
        }
      : {})
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        subtotal: true,
        couponCode: true,
        couponDiscount: true,
        gst: true,
        shipping: true,
        total: true,
        status: true,
        createdAt: true,
        payment: {
          select: {
            status: true,
            razorpayOrderId: true,
            razorpayPaymentId: true,
            amount: true,
            currency: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  return {
    data: orders.map((order) => mapAdminOrderSummary(order as AdminOrderRecord)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
    }
  };
}

export async function adminGetOrderById(
  params: AdminGetOrderByIdValidatedInput["params"]
): Promise<{ data: AdminOrderDetailResponse }> {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      email: true,
      name: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
      country: true,
      subtotal: true,
      couponCode: true,
      couponDiscount: true,
      gst: true,
      shipping: true,
      total: true,
      status: true,
      createdAt: true,
      payment: {
        select: {
          status: true,
          razorpayOrderId: true,
          razorpayPaymentId: true,
          amount: true,
          currency: true
        }
      },
      items: {
        select: {
          productId: true,
          variantId: true,
          slug: true,
          name: true,
          image: true,
          variantLabel: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!order) {
    throw new HttpError(404, "Order not found", undefined, "ORDER_NOT_FOUND");
  }

  const summary = mapAdminOrderSummary(order as AdminOrderRecord);

  return {
    data: {
      ...summary,
      couponCode: order.couponCode,
      items: order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        slug: item.slug,
        name: item.name,
        image: item.image,
        variantLabel: item.variantLabel,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal
      })),
      shippingAddress: {
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        country: order.country
      }
    }
  };
}

export async function adminPatchOrderStatus(params: {
  route: AdminPatchOrderStatusValidatedInput["params"];
  payload: AdminPatchOrderStatusValidatedInput["body"];
}): Promise<{ data: { id: string; status: AdminOrderRecord["status"] } }> {
  const order = await prisma.order.findUnique({
    where: { id: params.route.id },
    select: {
      id: true,
      status: true
    }
  });

  if (!order) {
    throw new HttpError(404, "Order not found", undefined, "ORDER_NOT_FOUND");
  }

  assertOrderStatusTransition({
    from: order.status,
    to: params.payload.status
  });

  const updated = await prisma.order.update({
    where: { id: params.route.id },
    data: {
      status: params.payload.status
    },
    select: {
      id: true,
      status: true
    }
  });

  if (order.status !== "delivered" && updated.status === "delivered") {
    void sendDeliveredOrderReviewRequestEmails(updated.id).catch((error) => {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.error("Delivered review request email dispatch failed", {
          orderId: updated.id,
          name: error instanceof Error ? error.name : "UnknownError"
        });
      }
    });
  }

  return {
    data: {
      id: updated.id,
      status: updated.status
    }
  };
}

export async function adminListHomepage(): Promise<{ data: AdminHomepageSectionResponse[] }> {
  const sections = await prisma.homepageSection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }]
  });

  return {
    data: sections.map((section) => mapHomepageSection(section))
  };
}

export async function adminPatchHomepage(params: {
  route: AdminPatchHomepageValidatedInput["params"];
  payload: AdminPatchHomepageValidatedInput["body"];
}): Promise<{ data: AdminHomepageSectionResponse }> {
  const key = params.route.key.trim();
  const createData: Prisma.HomepageSectionCreateInput = { key };
  const updateData: Prisma.HomepageSectionUpdateInput = {};

  if (params.payload.title !== undefined) {
    createData.title = params.payload.title;
    updateData.title = params.payload.title;
  }
  if (params.payload.subtitle !== undefined) {
    createData.subtitle = params.payload.subtitle;
    updateData.subtitle = params.payload.subtitle;
  }
  if (params.payload.body !== undefined) {
    createData.body = params.payload.body;
    updateData.body = params.payload.body;
  }
  if (params.payload.imageUrl !== undefined) {
    createData.imageUrl = params.payload.imageUrl;
    updateData.imageUrl = params.payload.imageUrl;
  }
  if (params.payload.linkUrl !== undefined) {
    createData.linkUrl = params.payload.linkUrl;
    updateData.linkUrl = params.payload.linkUrl;
  }
  if (params.payload.metadata !== undefined) {
    const metadata = params.payload.metadata as Prisma.InputJsonObject;
    createData.metadata = metadata;
    updateData.metadata = metadata;
  }
  if (params.payload.isActive !== undefined) {
    createData.isActive = params.payload.isActive;
    updateData.isActive = params.payload.isActive;
  }
  if (params.payload.position !== undefined) {
    createData.position = params.payload.position;
    updateData.position = params.payload.position;
  }

  const updated = await prisma.homepageSection.upsert({
    where: {
      key
    },
    create: createData,
    update: updateData
  });

  return {
    data: mapHomepageSection(updated)
  };
}
