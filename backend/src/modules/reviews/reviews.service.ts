import { prisma } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../../middleware/auth.middleware";
import { HttpError } from "../../utils/http-error";
import type {
  CreateReviewRequest,
  CreateReviewResponse,
  ListReviewsQuery,
  ListReviewsResponse
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
      id: true,
      createdAt: true
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
    data: reviews.map((review: {
      id: string;
      rating: number;
      subject: string | null;
      body: string;
      productId: string | null;
      createdAt: Date;
      name: string;
      email: string | null;
    }) => ({
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
