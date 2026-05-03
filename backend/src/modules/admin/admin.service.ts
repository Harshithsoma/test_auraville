import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/prisma.service";
import { HttpError } from "../../utils/http-error";
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
  AdminDeleteReviewValidatedInput,
  AdminDeleteCategoryValidatedInput,
  AdminDeleteProductValidatedInput,
  AdminDeleteVariantValidatedInput,
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
    unit: string;
    stock: number;
    sku: string | null;
    isActive: boolean;
  }>;
};

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
      unit: variant.unit,
      stock: variant.stock,
      sku: variant.sku,
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

function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

function mapCoupon(coupon: {
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
}): AdminCouponResponse {
  return {
    id: coupon.id,
    code: coupon.code,
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
          unit: true,
          stock: true,
          sku: true,
          isActive: true,
          createdAt: true
        },
        orderBy: {
          createdAt: "asc"
        }
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
  if (typeof query.isFeatured === "boolean") where.isFeatured = query.isFeatured;
  if (typeof query.isBestSeller === "boolean") where.isBestSeller = query.isBestSeller;
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
            unit: true,
            stock: true,
            sku: true,
            isActive: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "asc"
          }
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

  const gallery = payload.gallery && payload.gallery.length > 0 ? payload.gallery : [payload.image];

  await prisma.product.create({
    data: {
      id: payload.id,
      slug: payload.slug,
      name: payload.name,
      tagline: payload.tagline,
      description: payload.description,
      longDescription: payload.longDescription,
      price: payload.price,
      compareAtPrice: payload.compareAtPrice ?? null,
      promoLabel: payload.promoLabel ?? null,
      currency: payload.currency ?? "INR",
      image: payload.image,
      categoryId: payload.categoryId,
      availability: toDbAvailability(payload.availability),
      releaseNote: payload.releaseNote ?? null,
      rating: payload.rating ?? 0,
      reviewCount: payload.reviewCount ?? 0,
      isFeatured: payload.isFeatured ?? false,
      isBestSeller: payload.isBestSeller ?? false,
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
        create: variantPayload.map((variant) => ({
          frontendVariantId: variant.frontendVariantId,
          label: variant.label,
          price: variant.price,
          unit: variant.unit,
          stock: variant.stock,
          sku: variant.sku,
          isActive: variant.isActive ?? true
        }))
      }
    }
  });

  const created = await getAdminProductRecordById(payload.id);
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

  return {
    data: {
      id: params.id,
      isActive: false
    }
  };
}

export async function adminCreateVariant(params: {
  route: AdminCreateVariantValidatedInput["params"];
  payload: AdminCreateVariantValidatedInput["body"];
}): Promise<{ data: { id: string; label: string; price: number; unit: string; stock: number; sku: string | null; isActive: boolean } }> {
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

  const created = await prisma.productVariant.create({
    data: {
      productId: route.id,
      frontendVariantId: payload.frontendVariantId,
      label: payload.label,
      price: payload.price,
      unit: payload.unit,
      stock: payload.stock,
      sku: payload.sku,
      isActive: payload.isActive ?? true
    },
    select: {
      frontendVariantId: true,
      label: true,
      price: true,
      unit: true,
      stock: true,
      sku: true,
      isActive: true
    }
  });

  return {
    data: {
      id: created.frontendVariantId,
      label: created.label,
      price: created.price,
      unit: created.unit,
      stock: created.stock,
      sku: created.sku,
      isActive: created.isActive
    }
  };
}

export async function adminPatchVariant(params: {
  route: AdminPatchVariantValidatedInput["params"];
  payload: AdminPatchVariantValidatedInput["body"];
}): Promise<{ data: { id: string; label: string; price: number; unit: string; stock: number; sku: string | null; isActive: boolean } }> {
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
      frontendVariantId: true
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

  const updated = await prisma.productVariant.update({
    where: { id: variant.id },
    data: {
      ...(payload.frontendVariantId !== undefined ? { frontendVariantId: payload.frontendVariantId } : {}),
      ...(payload.label !== undefined ? { label: payload.label } : {}),
      ...(payload.price !== undefined ? { price: payload.price } : {}),
      ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
      ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
      ...(payload.sku !== undefined ? { sku: payload.sku } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
    },
    select: {
      frontendVariantId: true,
      label: true,
      price: true,
      unit: true,
      stock: true,
      sku: true,
      isActive: true
    }
  });

  return {
    data: {
      id: updated.frontendVariantId,
      label: updated.label,
      price: updated.price,
      unit: updated.unit,
      stock: updated.stock,
      sku: updated.sku,
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

  return {
    data: {
      id: variant.frontendVariantId,
      isActive: false
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
