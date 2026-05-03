"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type AdminReview = {
  id: string;
  productId: string | null;
  userId: string | null;
  name: string;
  email: string | null;
  rating: number;
  subject: string | null;
  body: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
};

type ListReviewsResponse = {
  data: AdminReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ApproveReviewResponse = {
  data: AdminReview;
};

type DeleteReviewResponse = {
  data: {
    id: string;
    deleted: true;
  };
};

type Filters = {
  isApproved: "all" | "true" | "false";
  productId: string;
};

const defaultFilters: Filters = {
  isApproved: "all",
  productId: ""
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

function toBooleanFilter(value: Filters["isApproved"]): boolean | undefined {
  if (value === "all") return undefined;
  return value === "true";
}

export function AdminReviewsClient() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page,
      limit,
      isApproved: toBooleanFilter(filters.isApproved),
      productId: filters.productId.trim() || undefined
    }),
    [filters.isApproved, filters.productId, limit, page]
  );

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const response = await commerceApi.admin.reviews.list<ListReviewsResponse>(query);
      setReviews(response.data);
      setPagination(response.pagination);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to load reviews.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function approveReview(reviewId: string) {
    setBusyReviewId(reviewId);
    setActionError(null);
    setMessage(null);

    try {
      const response = await commerceApi.admin.reviews.approve<ApproveReviewResponse>(reviewId);
      setReviews((current) =>
        current.map((entry) => (entry.id === reviewId ? response.data : entry))
      );
      setMessage("Review approved.");
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError("Unable to approve review.");
      }
    } finally {
      setBusyReviewId(null);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!window.confirm("Delete this review permanently?")) {
      return;
    }

    setBusyReviewId(reviewId);
    setActionError(null);
    setMessage(null);

    try {
      await commerceApi.admin.reviews.delete<DeleteReviewResponse>(reviewId);
      setReviews((current) => current.filter((entry) => entry.id !== reviewId));
      setMessage("Review deleted.");
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError("Unable to delete review.");
      }
    } finally {
      setBusyReviewId(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Reviews</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Moderate submitted reviews and control approval state.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadReviews()}>
          Refresh
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Approval</span>
          <Select
            className="mt-2"
            value={filters.isApproved}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({
                ...current,
                isApproved: event.target.value as Filters["isApproved"]
              }));
            }}
          >
            <option value="all">All</option>
            <option value="true">Approved</option>
            <option value="false">Pending</option>
          </Select>
        </label>

        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Product Id</span>
          <Input
            className="mt-2"
            placeholder="optional productId"
            value={filters.productId}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, productId: event.target.value }));
            }}
          />
        </label>

        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Items/Page</span>
          <Select
            className="mt-2"
            value={String(limit)}
            onChange={(event) => {
              setPage(1);
              setLimit(Number(event.target.value));
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
        </label>
      </div>

      {message ? (
        <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
          {message}
        </div>
      ) : null}
      {actionError ? (
        <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
          {actionError}
        </div>
      ) : null}
      {listError ? (
        <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
          {listError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
          No reviews found for current filters.
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-[var(--line)] xl:block">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--mint)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3">Rating</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Body</th>
                  <th className="px-3 py-3">User / Email</th>
                  <th className="px-3 py-3">Product Id</th>
                  <th className="px-3 py-3">Approved</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr className="border-t border-[var(--line)]" key={review.id}>
                    <td className="px-3 py-3">{review.rating}</td>
                    <td className="px-3 py-3">{review.subject ?? "-"}</td>
                    <td className="max-w-[360px] px-3 py-3">
                      <p className="line-clamp-3">{review.body}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p>{review.name}</p>
                      <p>{review.email ?? "-"}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">{review.productId ?? "general"}</td>
                    <td className="px-3 py-3">{review.isApproved ? "yes" : "no"}</td>
                    <td className="px-3 py-3 text-xs">{formatDate(review.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busyReviewId === review.id || review.isApproved}
                          onClick={() => void approveReview(review.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busyReviewId === review.id}
                          onClick={() => void deleteReview(review.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 xl:hidden">
            {reviews.map((review) => (
              <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={review.id}>
                <p className="text-sm font-semibold">
                  {review.rating}/5 • {review.subject ?? "No subject"}
                </p>
                <p className="mt-2 text-sm">{review.body}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {review.name} ({review.email ?? "-"})
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {review.productId ?? "general"} | approved: {review.isApproved ? "yes" : "no"}
                </p>
                <p className="text-xs text-[var(--muted)]">{formatDate(review.createdAt)}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    className="flex-1"
                    type="button"
                    variant="secondary"
                    disabled={busyReviewId === review.id || review.isApproved}
                    onClick={() => void approveReview(review.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    className="flex-1"
                    type="button"
                    variant="ghost"
                    disabled={busyReviewId === review.id}
                    onClick={() => void deleteReview(review.id)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-[var(--muted)]">
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ({pagination.total} reviews)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pagination.totalPages === 0 || page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
