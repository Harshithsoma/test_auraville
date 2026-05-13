import { randomBytes } from "crypto";
import { env } from "../../config/env";
import type { AuthenticatedUser } from "../../middleware/auth.middleware";
import { prisma } from "../../prisma/prisma.service";
import { sha256 } from "../../utils/hash";
import { HttpError } from "../../utils/http-error";
import type {
  CreateReviewRequest,
  CreateReviewResponse,
  ListReviewsQuery,
  ListReviewsResponse,
  VerifiedRateRequest,
  VerifiedReviewPromptResponse,
  VerifiedReviewTextRequest
} from "./reviews.types";

function maskEmail(email: string | null): string {
  if (!email) {
    return "masked";
  }

  const [localPart, domainPart] = email.split("@");
  if (!localPart || !domainPart) {
    return "masked";
  }

  const firstChar = localPart[0]?.toLowerCase() ?? "*";
  return `${firstChar}***@${domainPart.toLowerCase()}`;
}

function snapshotName(user: AuthenticatedUser): string {
  if (user.name && user.name.trim().length > 0) {
    return user.name.trim();
  }

  const fallback = user.email.split("@")[0];
  return fallback && fallback.trim().length > 0 ? fallback : "Auraville User";
}

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

function buildReviewLink(params: { token: string; rating: number }): string {
  const origin = env.FRONTEND_URL.replace(/\/+$/, "");
  const url = new URL("/review", origin);
  url.searchParams.set("token", params.token);
  url.searchParams.set("rating", String(params.rating));
  return url.toString();
}

function buildReviewEmail(params: {
  productName: string;
  productImage: string;
  links: Array<{ rating: number; url: string }>;
}) {
  const subject = `How was your ${params.productName}?`;
  const textLines = [
    `Thanks for your Auraville order. How was your ${params.productName}?`,
    "",
    ...params.links.map((item) => `${item.rating} star${item.rating > 1 ? "s" : ""}: ${item.url}`),
    "",
    "Auraville"
  ];

  const starsHtml = params.links
    .map(
      (item) =>
        `<a href="${item.url}" style="text-decoration:none;font-size:24px;line-height:1;margin-right:8px;color:#c99a2e;">${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}</a>`
    )
    .join("");

  const htmlContent = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2d26;line-height:1.5;">
    <h2 style="margin:0 0 12px;">How was your ${params.productName}?</h2>
    <p style="margin:0 0 12px;">Tap a star rating below to rate your delivered product.</p>
    <div style="margin:10px 0 16px;">${starsHtml}</div>
    <a href="${params.links[4]?.url ?? params.links[0]?.url}" style="display:inline-block;background:#2f5d45;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">
      Rate now
    </a>
    <div style="margin-top:16px;">
      <img src="${params.productImage}" alt="${params.productName}" style="max-width:220px;border-radius:12px;" />
    </div>
    <p style="margin:16px 0 0;">Auraville</p>
  </div>
  `.trim();

  return {
    subject,
    textContent: textLines.join("\n"),
    htmlContent
  };
}

async function sendReviewRequestEmail(params: {
  email: string;
  productName: string;
  productImage: string;
  links: Array<{ rating: number; url: string }>;
}): Promise<void> {
  if (env.OTP_DELIVERY_MODE === "dev_log") {
    return;
  }

  if (env.OTP_EMAIL_PROVIDER !== "brevo" || !env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    throw new HttpError(
      500,
      "Review email provider is not configured",
      undefined,
      "REVIEW_EMAIL_PROVIDER_NOT_CONFIGURED"
    );
  }

  const content = buildReviewEmail(params);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), env.EXTERNAL_API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_SENDER_EMAIL,
          name: env.BREVO_SENDER_NAME || "Auraville"
        },
        to: [{ email: params.email }],
        subject: content.subject,
        textContent: content.textContent,
        htmlContent: content.htmlContent
      }),
      signal: abortController.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    await response.text();
    throw new HttpError(500, "Unable to send review request email", undefined, "REVIEW_EMAIL_SEND_FAILED");
  }
}

async function ensureValidProductForReview(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      isActive: true
    }
  });

  if (!product || !product.isActive) {
    throw new HttpError(404, "Product not found", undefined, "PRODUCT_NOT_FOUND");
  }
}

async function enforceReviewFrequencyLimit(params: {
  userId: string;
  productId: string | null;
}): Promise<void> {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);

  const latest = await prisma.review.findFirst({
    where: {
      userId: params.userId,
      productId: params.productId,
      createdAt: {
        gte: cutoff
      }
    },
    select: {
      id: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (latest) {
    throw new HttpError(
      429,
      "Please wait before submitting another review",
      {
        cooldownSeconds: 120
      },
      "REVIEW_RATE_LIMITED"
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
    where: {
      id: productId
    },
    data: {
      rating: nextRating,
      reviewCount: nextCount
    }
  });
}

async function resolveDeliveredOrderItemForVerifiedReview(params: {
  userId: string;
  payload: VerifiedRateRequest;
}) {
  const order = await prisma.order.findFirst({
    where: {
      id: params.payload.orderId,
      userId: params.userId,
      status: "delivered"
    },
    select: {
      id: true,
      userId: true,
      email: true,
      items: {
        where: {
          id: params.payload.orderItemId
        },
        select: {
          id: true,
          productId: true,
          name: true
        }
      }
    }
  });

  if (!order) {
    throw new HttpError(
      400,
      "Only delivered purchases can be rated from this flow.",
      undefined,
      "REVIEW_NOT_ELIGIBLE"
    );
  }

  const orderItem = order.items[0];
  if (!orderItem || orderItem.productId !== params.payload.productId) {
    throw new HttpError(400, "Invalid product rating target", undefined, "REVIEW_NOT_ELIGIBLE");
  }

  return {
    orderId: order.id,
    orderItemId: orderItem.id,
    productId: orderItem.productId,
    productName: orderItem.name,
    email: order.email
  };
}

export async function createReview(params: {
  user: AuthenticatedUser;
  payload: CreateReviewRequest;
}): Promise<CreateReviewResponse> {
  const { user, payload } = params;
  const normalizedProductId = payload.productId?.trim() || null;

  if (normalizedProductId) {
    await ensureValidProductForReview(normalizedProductId);
  }

  await enforceReviewFrequencyLimit({
    userId: user.id,
    productId: normalizedProductId
  });

  const created = await prisma.review.create({
    data: {
      userId: user.id,
      name: snapshotName(user),
      email: user.email.toLowerCase(),
      rating: payload.rating,
      subject: payload.subject.trim(),
      body: payload.body.trim(),
      productId: normalizedProductId,
      isApproved: false
    },
    select: {
      id: true
    }
  });

  return {
    data: {
      id: created.id,
      message: "Review submitted for approval"
    }
  };
}

export async function createVerifiedReviewRating(params: {
  user: AuthenticatedUser;
  payload: VerifiedRateRequest;
}): Promise<{ data: { reviewId: string; message: string } }> {
  const { user, payload } = params;

  await ensureValidProductForReview(payload.productId);
  const target = await resolveDeliveredOrderItemForVerifiedReview({
    userId: user.id,
    payload
  });

  const result = await prisma.review.upsert({
    where: {
      orderItemId: target.orderItemId
    },
    create: {
      userId: user.id,
      orderId: target.orderId,
      orderItemId: target.orderItemId,
      productId: target.productId,
      name: snapshotName(user),
      email: user.email.toLowerCase(),
      rating: payload.rating,
      subject: "Verified purchase rating",
      body: `Rated ${payload.rating} star${payload.rating > 1 ? "s" : ""} from delivered order.`,
      isVerifiedPurchase: true,
      isApproved: true
    },
    update: {
      rating: payload.rating,
      isApproved: true,
      isVerifiedPurchase: true
    },
    select: {
      id: true
    }
  });

  await recomputeProductRating(payload.productId);

  return {
    data: {
      reviewId: result.id,
      message: "Rating saved. You can add optional written feedback next."
    }
  };
}

export async function updateVerifiedReviewText(params: {
  user: AuthenticatedUser;
  payload: VerifiedReviewTextRequest;
}): Promise<{ data: { reviewId: string; message: string } }> {
  const review = await prisma.review.findFirst({
    where: {
      id: params.payload.reviewId,
      userId: params.user.id,
      isVerifiedPurchase: true
    },
    select: {
      id: true,
      productId: true
    }
  });

  if (!review) {
    throw new HttpError(404, "Verified rating not found", undefined, "REVIEW_NOT_FOUND");
  }

  const subject = params.payload.subject?.trim();
  const body = params.payload.body?.trim();

  await prisma.review.update({
    where: {
      id: review.id
    },
    data: {
      ...(subject !== undefined && subject.length > 0 ? { subject } : {}),
      ...(body !== undefined && body.length > 0 ? { body } : {}),
      isApproved: true
    }
  });

  if (review.productId) {
    await recomputeProductRating(review.productId);
  }

  return {
    data: {
      reviewId: review.id,
      message: "Review updated. Thank you for your feedback."
    }
  };
}

export async function getVerifiedReviewPrompt(user: AuthenticatedUser): Promise<VerifiedReviewPromptResponse> {
  const deliveredOrders = await prisma.order.findMany({
    where: {
      userId: user.id,
      status: "delivered"
    },
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          slug: true,
          name: true,
          image: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });

  if (deliveredOrders.length === 0) {
    return { data: null };
  }

  const orderItemIds = deliveredOrders.flatMap((order) => order.items.map((item) => item.id));
  const existingRatings = await prisma.review.findMany({
    where: {
      userId: user.id,
      isVerifiedPurchase: true,
      orderItemId: {
        in: orderItemIds
      }
    },
    select: {
      orderItemId: true
    }
  });
  const ratedOrderItemIds = new Set(existingRatings.map((item) => item.orderItemId).filter(Boolean) as string[]);

  for (const order of deliveredOrders) {
    for (const item of order.items) {
      if (!ratedOrderItemIds.has(item.id)) {
        return {
          data: {
            productId: item.productId,
            productName: item.name,
            productSlug: item.slug,
            productImage: item.image,
            orderId: order.id,
            orderItemId: item.id
          }
        };
      }
    }
  }

  return { data: null };
}

export async function createVerifiedReviewFromEmailLink(params: {
  token: string;
  rating: number;
}): Promise<{ data: { reviewId: string; message: string; productSlug: string } }> {
  const tokenHash = sha256(params.token);
  const tokenRecord = await prisma.reviewRequestToken.findUnique({
    where: {
      tokenHash
    },
    select: {
      id: true,
      userId: true,
      productId: true,
      orderId: true,
      orderItemId: true,
      usedAt: true,
      expiresAt: true,
      product: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new HttpError(400, "Invalid or expired review link", undefined, "INVALID_REVIEW_LINK");
  }

  if (tokenRecord.usedAt) {
    const existing = await prisma.review.findUnique({
      where: {
        orderItemId: tokenRecord.orderItemId
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      throw new HttpError(400, "Review link already used", undefined, "INVALID_REVIEW_LINK");
    }

    return {
      data: {
        reviewId: existing.id,
        message: "Rating already saved for this delivered product.",
        productSlug: tokenRecord.product.slug
      }
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      id: tokenRecord.orderId,
      userId: tokenRecord.userId,
      status: "delivered"
    },
    select: {
      id: true,
      email: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true
        }
      }
    }
  });

  if (!order || !order.user) {
    throw new HttpError(400, "Review link is no longer valid", undefined, "INVALID_REVIEW_LINK");
  }

  const ratingResult = await createVerifiedReviewRating({
    user: {
      id: order.user.id,
      email: order.user.email,
      name: order.user.name,
      phone: order.user.phone,
      role: order.user.role
    },
    payload: {
      orderId: tokenRecord.orderId,
      orderItemId: tokenRecord.orderItemId,
      productId: tokenRecord.productId,
      rating: params.rating
    }
  });

  await prisma.reviewRequestToken.update({
    where: {
      id: tokenRecord.id
    },
    data: {
      usedAt: new Date(),
      suggestedRating: params.rating
    }
  });

  return {
    data: {
      reviewId: ratingResult.data.reviewId,
      message: ratingResult.data.message,
      productSlug: tokenRecord.product.slug
    }
  };
}

export async function updateVerifiedReviewTextFromEmailLink(params: {
  token: string;
  reviewId: string;
  subject?: string;
  body?: string;
}): Promise<{ data: { reviewId: string; message: string } }> {
  const tokenHash = sha256(params.token);
  const tokenRecord = await prisma.reviewRequestToken.findUnique({
    where: {
      tokenHash
    },
    select: {
      id: true,
      orderItemId: true,
      expiresAt: true
    }
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new HttpError(400, "Invalid or expired review link", undefined, "INVALID_REVIEW_LINK");
  }

  const review = await prisma.review.findFirst({
    where: {
      id: params.reviewId,
      orderItemId: tokenRecord.orderItemId,
      isVerifiedPurchase: true
    },
    select: {
      id: true,
      productId: true
    }
  });

  if (!review) {
    throw new HttpError(404, "Verified review not found", undefined, "REVIEW_NOT_FOUND");
  }

  const subject = params.subject?.trim();
  const body = params.body?.trim();

  await prisma.review.update({
    where: {
      id: review.id
    },
    data: {
      ...(subject !== undefined && subject.length > 0 ? { subject } : {}),
      ...(body !== undefined && body.length > 0 ? { body } : {}),
      isApproved: true
    }
  });

  if (review.productId) {
    await recomputeProductRating(review.productId);
  }

  return {
    data: {
      reviewId: review.id,
      message: "Review updated. Thank you for your feedback."
    }
  };
}

export async function sendDeliveredOrderReviewRequestEmails(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    },
    select: {
      id: true,
      status: true,
      email: true,
      userId: true,
      items: {
        select: {
          id: true,
          productId: true,
          name: true,
          image: true
        }
      }
    }
  });

  if (!order || order.status !== "delivered" || !order.userId || !isValidEmail(order.email)) {
    return;
  }

  for (const item of order.items) {
    const existingReview = await prisma.review.findFirst({
      where: {
        orderItemId: item.id,
        userId: order.userId
      },
      select: {
        id: true
      }
    });

    if (existingReview) {
      continue;
    }

    const existingToken = await prisma.reviewRequestToken.findFirst({
      where: {
        userId: order.userId,
        orderItemId: item.id,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true
      }
    });

    if (existingToken) {
      continue;
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const createdToken = await prisma.reviewRequestToken.create({
      data: {
        tokenHash,
        userId: order.userId,
        productId: item.productId,
        orderId: order.id,
        orderItemId: item.id,
        email: order.email.toLowerCase(),
        expiresAt
      }
    });

    const links = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      url: buildReviewLink({
        token,
        rating
      })
    }));

    try {
      await sendReviewRequestEmail({
        email: order.email.toLowerCase(),
        productName: item.name,
        productImage: item.image,
        links
      });
    } catch (error) {
      await prisma.reviewRequestToken.delete({
        where: {
          id: createdToken.id
        }
      }).catch(() => undefined);
      if (env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.error("Review request email failed", {
          orderId: order.id,
          orderItemId: item.id,
          recipient: maskEmail(order.email),
          code: error instanceof HttpError ? error.errorCode : "REVIEW_EMAIL_SEND_FAILED"
        });
      }
    }
  }
}

export async function listApprovedReviews(query: ListReviewsQuery): Promise<ListReviewsResponse> {
  const where = {
    isApproved: true,
    ...(query.productId ? { productId: query.productId } : {})
  };

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        subject: true,
        body: true,
        productId: true,
        createdAt: true,
        name: true,
        email: true
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  return {
    data: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      subject: review.subject ?? "",
      body: review.body,
      productId: review.productId,
      createdAt: review.createdAt.toISOString(),
      user: {
        name: review.name,
        email: maskEmail(review.email)
      }
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
    }
  };
}
