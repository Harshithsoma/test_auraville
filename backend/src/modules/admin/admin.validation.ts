import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const booleanFromQuery = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => (typeof value === "boolean" ? value : value === "true"));

const availabilitySchema = z.enum(["available", "coming-soon"]);
const homepageSectionKeySchema = z.enum([
  "hero",
  "infinite_scrolling_banner",
  "usp_features",
  "announcement",
  "featured_core_product",
  "why_auraville",
  "do_you_know",
  "faq"
]);
const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed"
]);
const orderFulfillmentStageSchema = z.enum([
  "order_placed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered"
]);

const metadataObjectSchema = z
  .custom<Record<string, unknown>>(
    (value) => typeof value === "object" && value !== null && !Array.isArray(value),
    { message: "metadata must be a JSON object" }
  );

function isAllowedHomepageImageUrl(value: string): boolean {
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("/")) {
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(normalized);
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  if (parsed.protocol.toLowerCase() !== "https:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
  if (blockedHosts.has(host)) {
    return false;
  }

  if (host === "res.cloudinary.com" && parsed.pathname.includes("/image/upload/")) {
    return true;
  }

  if (host === "images.unsplash.com" || host === "source.unsplash.com") {
    return true;
  }

  return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(parsed.pathname);
}

const homepageImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => isAllowedHomepageImageUrl(value), {
    message: "imageUrl must be a local image path or supported HTTPS image URL"
  });

const homepageLinkUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value.startsWith("/") || z.string().url().safeParse(value).success, {
    message: "linkUrl must be a valid URL or relative path"
  });

const productVariantBodySchema = z.object({
  frontendVariantId: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  price: z.coerce.number().int().min(0).optional(),
  compareAtPrice: z.coerce.number().int().min(0).nullable().optional(),
  discountPercent: z.coerce.number().int().min(0).max(100).optional(),
  unit: z.string().trim().min(1).max(40),
  stock: z.coerce.number().int().min(0),
  sku: z.string().trim().min(1).max(120).optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

const productBaseBodySchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  slug: slugSchema,
  name: z.string().trim().min(1).max(180),
  tagline: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(1000),
  longDescription: z.string().trim().min(1).max(10000),
  price: z.coerce.number().int().min(0).optional(),
  compareAtPrice: z.coerce.number().int().min(0).nullable().optional(),
  promoLabel: z.string().trim().min(1).max(120).nullable().optional(),
  currency: z.literal("INR").optional(),
  image: z.string().trim().min(1).max(2048),
  gallery: z.array(z.string().trim().min(1).max(2048)).min(1).optional(),
  categoryId: z.string().trim().min(1),
  availability: availabilitySchema.default("available"),
  releaseNote: z.string().trim().min(1).max(255).nullable().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  badgeLabel: z.string().trim().min(1).max(120).nullable().optional(),
  popularity: z.coerce.number().int().min(0).optional(),
  ingredients: z.array(z.string().trim().min(1).max(255)).optional(),
  benefits: z.array(z.string().trim().min(1).max(255)).optional(),
  isActive: z.boolean().optional(),
  variants: z.array(productVariantBodySchema).optional()
});

export const adminListProductsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    availability: availabilitySchema.optional(),
    isActive: booleanFromQuery.optional(),
    isFeatured: booleanFromQuery.optional(),
    isBestSeller: booleanFromQuery.optional(),
    isNew: booleanFromQuery.optional()
  })
});

export const adminGetProductByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export const adminCreateProductSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: productBaseBodySchema
});

const adminPatchProductBodySchema = productBaseBodySchema
  .omit({ id: true, variants: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export const adminPatchProductSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  body: adminPatchProductBodySchema
});

export const adminDeleteProductSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export const adminHardDeleteProductSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  body: z.object({
    confirmText: z.string().trim().min(1).max(255)
  })
});

export const adminCreateVariantSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  body: productVariantBodySchema
});

const adminPatchVariantBodySchema = productVariantBodySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one field is required"
  }
);

export const adminPatchVariantSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1),
    variantId: z.string().trim().min(1)
  }),
  body: adminPatchVariantBodySchema
});

export const adminDeleteVariantSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1),
    variantId: z.string().trim().min(1)
  })
});

export const adminHardDeleteVariantSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1),
    variantId: z.string().trim().min(1)
  }),
  body: z.object({
    confirmText: z.string().trim().min(1).max(255)
  })
});

export const adminListCategoriesSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const adminCreateCategorySchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    slug: slugSchema
  })
});

export const adminPatchCategorySchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      slug: slugSchema.optional()
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required"
    })
});

export const adminDeleteCategorySchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

const couponBodyObjectSchema = z.object({
  code: z.string().trim().min(1).max(64),
  description: z.string().trim().max(220).nullable().optional(),
  type: z.enum(["PERCENT", "FLAT"]),
  discountValue: z.coerce.number().int().positive(),
  minOrderValue: z.coerce.number().int().min(0).nullable().optional(),
  maxDiscount: z.coerce.number().int().min(0).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  usageLimit: z.coerce.number().int().min(1).nullable().optional(),
  usageLimitPerUser: z.coerce.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional()
});

const couponBodyBaseSchema = couponBodyObjectSchema.superRefine((value, ctx) => {
    if (value.type === "PERCENT" && (value.discountValue < 1 || value.discountValue > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "PERCENT discount must be between 1 and 100"
      });
    }

    if (value.type === "FLAT" && value.discountValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "FLAT discount must be positive"
      });
    }

    if (value.startsAt && value.expiresAt && value.expiresAt <= value.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "expiresAt must be after startsAt"
      });
    }
  });

export const adminListCouponsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    isActive: booleanFromQuery.optional()
  })
});

export const adminCreateCouponSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  body: couponBodyBaseSchema
});

export const adminPatchCouponSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  body: couponBodyObjectSchema
    .partial()
    .superRefine((value, ctx) => {
      if (Object.keys(value).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one field is required"
        });
      }

      if (value.type === "PERCENT" && value.discountValue !== undefined) {
        if (value.discountValue < 1 || value.discountValue > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["discountValue"],
            message: "PERCENT discount must be between 1 and 100"
          });
        }
      }

      if (value.type === "FLAT" && value.discountValue !== undefined && value.discountValue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountValue"],
          message: "FLAT discount must be positive"
        });
      }

      if (value.startsAt && value.expiresAt && value.expiresAt <= value.startsAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresAt"],
          message: "expiresAt must be after startsAt"
        });
      }
    })
});

export const adminDeleteCouponSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export const adminHardDeleteCouponSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export const adminListReviewsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isApproved: booleanFromQuery.optional(),
    productId: z.string().trim().min(1).optional()
  })
});

export const adminApproveReviewSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export const adminDeleteReviewSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export const adminListOrdersSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: orderStatusSchema.optional(),
      email: z.string().trim().min(1).optional(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional()
    })
    .superRefine((value, ctx) => {
      if (value.dateFrom && value.dateTo && value.dateTo < value.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateTo"],
          message: "dateTo must be on or after dateFrom"
        });
      }
    })
});

export const adminGetOrderByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  })
});

export const adminPatchOrderStatusSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  body: z.object({
    status: orderStatusSchema
  })
});

export const adminPatchOrderFulfillmentStageSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().trim().min(1)
  }),
  body: z.object({
    fulfillmentStage: orderFulfillmentStageSchema
  })
});

export const adminListHomepageSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

export const adminPatchHomepageSchema = z.object({
  query: z.object({}).passthrough(),
  params: z.object({
    key: homepageSectionKeySchema
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(255).nullable().optional(),
      subtitle: z.string().trim().min(1).max(500).nullable().optional(),
      body: z.string().trim().min(1).max(10000).nullable().optional(),
      imageUrl: homepageImageUrlSchema.optional(),
      linkUrl: homepageLinkUrlSchema.optional(),
      metadata: metadataObjectSchema.optional(),
      isActive: z.boolean().optional(),
      position: z.coerce.number().int().min(0).optional()
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required"
    })
});

export type AdminListProductsValidatedInput = z.infer<typeof adminListProductsSchema>;
export type AdminGetProductByIdValidatedInput = z.infer<typeof adminGetProductByIdSchema>;
export type AdminCreateProductValidatedInput = z.infer<typeof adminCreateProductSchema>;
export type AdminPatchProductValidatedInput = z.infer<typeof adminPatchProductSchema>;
export type AdminDeleteProductValidatedInput = z.infer<typeof adminDeleteProductSchema>;
export type AdminHardDeleteProductValidatedInput = z.infer<typeof adminHardDeleteProductSchema>;

export type AdminCreateVariantValidatedInput = z.infer<typeof adminCreateVariantSchema>;
export type AdminPatchVariantValidatedInput = z.infer<typeof adminPatchVariantSchema>;
export type AdminDeleteVariantValidatedInput = z.infer<typeof adminDeleteVariantSchema>;
export type AdminHardDeleteVariantValidatedInput = z.infer<typeof adminHardDeleteVariantSchema>;

export type AdminCreateCategoryValidatedInput = z.infer<typeof adminCreateCategorySchema>;
export type AdminPatchCategoryValidatedInput = z.infer<typeof adminPatchCategorySchema>;
export type AdminDeleteCategoryValidatedInput = z.infer<typeof adminDeleteCategorySchema>;

export type AdminListCouponsValidatedInput = z.infer<typeof adminListCouponsSchema>;
export type AdminCreateCouponValidatedInput = z.infer<typeof adminCreateCouponSchema>;
export type AdminPatchCouponValidatedInput = z.infer<typeof adminPatchCouponSchema>;
export type AdminDeleteCouponValidatedInput = z.infer<typeof adminDeleteCouponSchema>;
export type AdminHardDeleteCouponValidatedInput = z.infer<typeof adminHardDeleteCouponSchema>;

export type AdminListReviewsValidatedInput = z.infer<typeof adminListReviewsSchema>;
export type AdminApproveReviewValidatedInput = z.infer<typeof adminApproveReviewSchema>;
export type AdminDeleteReviewValidatedInput = z.infer<typeof adminDeleteReviewSchema>;

export type AdminListOrdersValidatedInput = z.infer<typeof adminListOrdersSchema>;
export type AdminGetOrderByIdValidatedInput = z.infer<typeof adminGetOrderByIdSchema>;
export type AdminPatchOrderStatusValidatedInput = z.infer<typeof adminPatchOrderStatusSchema>;
export type AdminPatchOrderFulfillmentStageValidatedInput = z.infer<typeof adminPatchOrderFulfillmentStageSchema>;
export type AdminListHomepageValidatedInput = z.infer<typeof adminListHomepageSchema>;
export type AdminPatchHomepageValidatedInput = z.infer<typeof adminPatchHomepageSchema>;
