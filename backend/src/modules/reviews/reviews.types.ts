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
