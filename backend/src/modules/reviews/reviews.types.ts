export type CreateReviewRequest = {
  rating: number;
  subject: string;
  body: string;
  productId?: string;
};

export type CreateReviewResponse = {
  data: {
    id: string;
    message: "Review submitted for approval";
  };
};

export type ListReviewsQuery = {
  productId?: string;
  page: number;
  limit: number;
};

export type ListReviewsResponse = {
  data: Array<{
    id: string;
    rating: number;
    subject: string;
    body: string;
    productId: string | null;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type VerifiedRateRequest = {
  orderId: string;
  orderItemId: string;
  productId: string;
  rating: number;
};

export type VerifiedReviewTextRequest = {
  reviewId: string;
  subject?: string;
  body?: string;
};

export type VerifiedReviewPromptResponse = {
  data: {
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string;
    orderId: string;
    orderItemId: string;
  } | null;
};
