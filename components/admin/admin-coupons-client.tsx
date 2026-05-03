"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type CouponType = "PERCENT" | "FLAT";

type AdminCoupon = {
  id: string;
  code: string;
  type: CouponType;
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ListCouponsResponse = {
  data: AdminCoupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CouponMutationResponse = {
  data: AdminCoupon;
};

type DeleteCouponResponse = {
  data: {
    id: string;
    isActive: boolean;
  };
};

type CouponFilters = {
  search: string;
  isActive: "all" | "true" | "false";
};

type CouponFormState = {
  code: string;
  type: CouponType;
  discountValue: string;
  minOrderValue: string;
  maxDiscount: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  usageLimitPerUser: string;
  isActive: boolean;
};

type FormMode = "create" | "edit";

const defaultFilters: CouponFilters = {
  search: "",
  isActive: "all"
};

const defaultForm: CouponFormState = {
  code: "",
  type: "PERCENT",
  discountValue: "",
  minOrderValue: "",
  maxDiscount: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  usageLimitPerUser: "",
  isActive: true
};

function toNullableInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString();
}

function toDateTimeLocalValue(isoValue: string | null): string {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function parseBooleanFilter(value: CouponFilters["isActive"]): boolean | undefined {
  if (value === "all") {
    return undefined;
  }
  return value === "true";
}

function buildCouponPayload(state: CouponFormState) {
  return {
    code: normalizeCode(state.code),
    type: state.type,
    discountValue: Number(state.discountValue.trim()),
    minOrderValue: toNullableInteger(state.minOrderValue),
    maxDiscount: toNullableInteger(state.maxDiscount),
    startsAt: toIsoOrNull(state.startsAt),
    expiresAt: toIsoOrNull(state.expiresAt),
    usageLimit: toNullableInteger(state.usageLimit),
    usageLimitPerUser: toNullableInteger(state.usageLimitPerUser),
    isActive: state.isActive
  };
}

function validateCouponForm(state: CouponFormState): string | null {
  const code = normalizeCode(state.code);
  if (!code) {
    return "Coupon code is required.";
  }

  const discountValue = Number(state.discountValue.trim());
  if (!Number.isFinite(discountValue)) {
    return "Discount value is required.";
  }

  if (state.type === "PERCENT" && (discountValue < 1 || discountValue > 100)) {
    return "PERCENT discount must be between 1 and 100.";
  }

  if (state.type === "FLAT" && discountValue <= 0) {
    return "FLAT discount must be positive.";
  }

  const minOrderValue = toNullableInteger(state.minOrderValue);
  if (minOrderValue !== null && (!Number.isInteger(minOrderValue) || minOrderValue < 0)) {
    return "Minimum order value must be a non-negative integer.";
  }

  const maxDiscount = toNullableInteger(state.maxDiscount);
  if (maxDiscount !== null && (!Number.isInteger(maxDiscount) || maxDiscount < 0)) {
    return "Max discount must be a non-negative integer.";
  }

  const usageLimit = toNullableInteger(state.usageLimit);
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    return "Usage limit must be a positive integer.";
  }

  const usageLimitPerUser = toNullableInteger(state.usageLimitPerUser);
  if (usageLimitPerUser !== null && (!Number.isInteger(usageLimitPerUser) || usageLimitPerUser < 1)) {
    return "Per-user usage limit must be a positive integer.";
  }

  const startsAtIso = toIsoOrNull(state.startsAt);
  const expiresAtIso = toIsoOrNull(state.expiresAt);
  if (state.startsAt.trim() && !startsAtIso) {
    return "Start date is invalid.";
  }
  if (state.expiresAt.trim() && !expiresAtIso) {
    return "Expiry date is invalid.";
  }

  if (startsAtIso && expiresAtIso && new Date(expiresAtIso) <= new Date(startsAtIso)) {
    return "Expiry must be after start date.";
  }

  return null;
}

export function AdminCouponsClient() {
  const [filters, setFilters] = useState<CouponFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CouponFormState>(defaultForm);

  const loadCoupons = useCallback(async (nextPage: number, nextLimit: number, nextFilters: CouponFilters) => {
    setIsLoading(true);
    setListError(null);

    try {
      const response = await commerceApi.admin.coupons.list<ListCouponsResponse>({
        page: nextPage,
        limit: nextLimit,
        search: nextFilters.search.trim() || undefined,
        isActive: parseBooleanFilter(nextFilters.isActive)
      });

      setCoupons(response.data);
      setPagination(response.pagination);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to load coupons.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCoupons(page, limit, filters);
  }, [filters, limit, loadCoupons, page]);

  function resetForm(nextMode: FormMode = "create") {
    setMode(nextMode);
    setEditingId(null);
    setFormState(defaultForm);
    setFormError(null);
    setFormMessage(null);
  }

  function beginEdit(coupon: AdminCoupon) {
    setMode("edit");
    setEditingId(coupon.id);
    setFormError(null);
    setFormMessage(null);
    setFormState({
      code: coupon.code,
      type: coupon.type,
      discountValue: String(coupon.discountValue),
      minOrderValue: coupon.minOrderValue === null ? "" : String(coupon.minOrderValue),
      maxDiscount: coupon.maxDiscount === null ? "" : String(coupon.maxDiscount),
      startsAt: toDateTimeLocalValue(coupon.startsAt),
      expiresAt: toDateTimeLocalValue(coupon.expiresAt),
      usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
      usageLimitPerUser: coupon.usageLimitPerUser === null ? "" : String(coupon.usageLimitPerUser),
      isActive: coupon.isActive
    });
  }

  async function saveCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCouponForm(formState);

    if (validationError) {
      setFormError(validationError);
      setFormMessage(null);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setFormMessage(null);

    const payload = buildCouponPayload(formState);

    try {
      if (mode === "create") {
        await commerceApi.admin.coupons.create<CouponMutationResponse, typeof payload>(payload);
        resetForm("create");
        setFormMessage("Coupon created.");
      } else if (editingId) {
        await commerceApi.admin.coupons.update<CouponMutationResponse, typeof payload>(editingId, payload);
        resetForm("create");
        setFormMessage("Coupon updated.");
      }

      await loadCoupons(page, limit, filters);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to save coupon.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function disableCoupon(coupon: AdminCoupon) {
    if (!window.confirm(`Disable coupon "${coupon.code}"?`)) {
      return;
    }

    setListError(null);
    try {
      await commerceApi.admin.coupons.delete<DeleteCouponResponse>(coupon.id);
      setCoupons((current) =>
        current.map((entry) => (entry.id === coupon.id ? { ...entry, isActive: false } : entry))
      );
      if (editingId === coupon.id) {
        setFormState((current) => ({ ...current, isActive: false }));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to disable coupon.");
      }
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Coupons</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Manage discounts, validity windows, and usage limits.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadCoupons(page, limit, filters)}>
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Search</span>
            <Input
              className="mt-2"
              placeholder="Code"
              value={filters.search}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, search: event.target.value }));
              }}
            />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Status</span>
            <Select
              className="mt-2"
              value={filters.isActive}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({
                  ...current,
                  isActive: event.target.value as CouponFilters["isActive"]
                }));
              }}
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Items/page</span>
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

        {listError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {listError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            Loading coupons...
          </div>
        ) : coupons.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            No coupons found.
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto rounded-lg border border-[var(--line)] xl:block">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--mint)] text-left uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Discount</th>
                    <th className="px-3 py-3">Min / Max</th>
                    <th className="px-3 py-3">Start</th>
                    <th className="px-3 py-3">Expiry</th>
                    <th className="px-3 py-3">Limits</th>
                    <th className="px-3 py-3">Used</th>
                    <th className="px-3 py-3">Active</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr className="border-t border-[var(--line)]" key={coupon.id}>
                      <td className="px-3 py-3 font-semibold">{coupon.code}</td>
                      <td className="px-3 py-3">{coupon.type}</td>
                      <td className="px-3 py-3">{coupon.discountValue}</td>
                      <td className="px-3 py-3">
                        {coupon.minOrderValue ?? "-"} / {coupon.maxDiscount ?? "-"}
                      </td>
                      <td className="px-3 py-3">{formatDate(coupon.startsAt)}</td>
                      <td className="px-3 py-3">{formatDate(coupon.expiresAt)}</td>
                      <td className="px-3 py-3">
                        {coupon.usageLimit ?? "-"} / {coupon.usageLimitPerUser ?? "-"}
                      </td>
                      <td className="px-3 py-3">{coupon.usedCount}</td>
                      <td className="px-3 py-3">{coupon.isActive ? "yes" : "no"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => beginEdit(coupon)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => void disableCoupon(coupon)}>
                            Disable
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 xl:hidden">
              {coupons.map((coupon) => (
                <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={coupon.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{coupon.code}</p>
                    <span className="text-xs text-[var(--muted)]">{coupon.type}</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Discount: {coupon.discountValue} | Min: {coupon.minOrderValue ?? "-"} | Max: {coupon.maxDiscount ?? "-"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Usage limit: {coupon.usageLimit ?? "-"} | Per user: {coupon.usageLimitPerUser ?? "-"} | Used:{" "}
                    {coupon.usedCount}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Active: {coupon.isActive ? "yes" : "no"} | Starts: {formatDate(coupon.startsAt)} | Expires:{" "}
                    {formatDate(coupon.expiresAt)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button className="flex-1" type="button" variant="secondary" onClick={() => beginEdit(coupon)}>
                      Edit
                    </Button>
                    <Button className="flex-1" type="button" variant="ghost" onClick={() => void disableCoupon(coupon)}>
                      Disable
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-[var(--muted)]">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ({pagination.total} coupons)
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
      </div>

      <form className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7" onSubmit={(event) => void saveCoupon(event)}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{mode === "create" ? "Create coupon" : "Edit coupon"}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Coupon code is normalized to uppercase before submit.
            </p>
          </div>
          {mode === "edit" ? (
            <Button type="button" variant="secondary" onClick={() => resetForm("create")}>
              Cancel edit
            </Button>
          ) : null}
        </div>

        {formError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {formError}
          </div>
        ) : null}
        {formMessage ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
            {formMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label>
            <span className="text-sm font-semibold">Code</span>
            <Input
              className="mt-2"
              value={formState.code}
              onChange={(event) =>
                setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))
              }
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Type</span>
            <Select
              className="mt-2"
              value={formState.type}
              onChange={(event) =>
                setFormState((current) => ({ ...current, type: event.target.value as CouponType }))
              }
            >
              <option value="PERCENT">PERCENT</option>
              <option value="FLAT">FLAT</option>
            </Select>
          </label>
          <label>
            <span className="text-sm font-semibold">Discount Value</span>
            <Input
              className="mt-2"
              min={0}
              type="number"
              value={formState.discountValue}
              onChange={(event) => setFormState((current) => ({ ...current, discountValue: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Min Order Value</span>
            <Input
              className="mt-2"
              min={0}
              type="number"
              value={formState.minOrderValue}
              onChange={(event) => setFormState((current) => ({ ...current, minOrderValue: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Max Discount</span>
            <Input
              className="mt-2"
              min={0}
              type="number"
              value={formState.maxDiscount}
              onChange={(event) => setFormState((current) => ({ ...current, maxDiscount: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Usage Limit</span>
            <Input
              className="mt-2"
              min={1}
              type="number"
              value={formState.usageLimit}
              onChange={(event) => setFormState((current) => ({ ...current, usageLimit: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Usage Limit Per User</span>
            <Input
              className="mt-2"
              min={1}
              type="number"
              value={formState.usageLimitPerUser}
              onChange={(event) =>
                setFormState((current) => ({ ...current, usageLimitPerUser: event.target.value }))
              }
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Starts At</span>
            <Input
              className="mt-2"
              type="datetime-local"
              value={formState.startsAt}
              onChange={(event) => setFormState((current) => ({ ...current, startsAt: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Expires At</span>
            <Input
              className="mt-2"
              type="datetime-local"
              value={formState.expiresAt}
              onChange={(event) => setFormState((current) => ({ ...current, expiresAt: event.target.value }))}
            />
          </label>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input
            checked={formState.isActive}
            type="checkbox"
            onChange={(event) => setFormState((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active
        </label>

        <div className="mt-6">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : mode === "create" ? "Create coupon" : "Save coupon"}
          </Button>
        </div>
      </form>
    </section>
  );
}
