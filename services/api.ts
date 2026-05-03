const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type NextFetchOptions = {
  revalidate?: number;
  tags?: string[];
};

type ApiRequestOptions<TBody> = Omit<RequestInit, "body"> & {
  body?: TBody;
  next?: NextFetchOptions;
  authToken?: string;
  retryOn401?: boolean;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(params: { status: number; code: string; message: string; details?: unknown }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function withBaseUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

function toJsonBody(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData) {
    return undefined;
  }

  return JSON.stringify(body);
}

function hasJsonContentType(headers: Headers): boolean {
  const contentType = headers.get("content-type");
  return Boolean(contentType && contentType.toLowerCase().includes("application/json"));
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  if (!hasJsonContentType(response.headers)) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toApiError(response: Response, payload: unknown): ApiError {
  const maybePayload = payload as ApiErrorPayload | null;
  const code = maybePayload?.error?.code ?? "API_ERROR";
  const message =
    maybePayload?.error?.message ?? `API request failed with status ${response.status}`;
  const details = maybePayload?.error?.details;

  return new ApiError({
    status: response.status,
    code,
    message,
    details
  });
}

function buildHeaders(params: {
  body: unknown;
  headers?: HeadersInit;
  authToken?: string;
}): Headers {
  const headers = new Headers(params.headers);
  const token = params.authToken ?? accessToken;

  if (params.body !== undefined && !(params.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshed = await request<{ data: { accessToken: string } }, undefined>("/auth/refresh", {
        method: "POST",
        retryOn401: false
      });
      setAccessToken(refreshed.data.accessToken);
    })()
      .catch((error) => {
        setAccessToken(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  await refreshPromise;
}

export async function request<TResponse, TBody = undefined>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> {
  const { body, authToken, retryOn401 = true, headers, ...rest } = options;

  const makeRequest = async (): Promise<Response> => {
    const payloadBody = body instanceof FormData ? body : toJsonBody(body);

    return fetch(withBaseUrl(path), {
      ...rest,
      credentials: "include",
      headers: buildHeaders({ body, headers, authToken }),
      body: payloadBody
    });
  };

  let response = await makeRequest();

  if (response.status === 401 && retryOn401 && path !== "/auth/refresh") {
    await refreshAccessToken();
    response = await makeRequest();
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw toApiError(response, payload);
  }

  return payload as TResponse;
}

export const commerceApi = {
  products: {
    list: <TResponse>(query?: Record<string, string | number | boolean | undefined>) => {
      const params = new URLSearchParams();

      if (query) {
        for (const [key, value] of Object.entries(query)) {
          if (value !== undefined) {
            params.set(key, String(value));
          }
        }
      }

      const suffix = params.toString();
      return request<TResponse>(suffix ? `/products?${suffix}` : "/products", {
        next: { revalidate: 300 }
      });
    },
    bySlug: <TResponse>(slug: string) =>
      request<TResponse>(`/products/${encodeURIComponent(slug)}`, {
        next: { revalidate: 300 }
      })
  },
  categories: {
    list: <TResponse>() => request<TResponse>("/categories", { next: { revalidate: 300 } })
  },
  cart: {
    price: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/cart/price", {
        method: "POST",
        body: payload
      })
  },
  coupons: {
    validate: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/coupons/validate", {
        method: "POST",
        body: payload
      })
  },
  auth: {
    sendOtp: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/otp/send", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    verifyOtp: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/otp/verify", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    signupOtpSend: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/signup/otp/send", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    signupOtpVerify: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/signup/otp/verify", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    loginOtpSend: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/login/otp/send", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    loginOtpVerify: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/login/otp/verify", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    loginPassword: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/login/password", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    refresh: <TResponse>() =>
      request<TResponse>("/auth/refresh", {
        method: "POST",
        retryOn401: false
      }),
    logout: <TResponse>() =>
      request<TResponse>("/auth/logout", {
        method: "POST",
        retryOn401: false
      }),
    me: <TResponse>() => request<TResponse>("/auth/me")
  },
  checkout: {
    createOrder: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/checkout/orders", {
        method: "POST",
        body: payload
      })
  },
  payments: {
    verify: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/payments/verify", {
        method: "POST",
        body: payload
      })
  },
  orders: {
    list: <TResponse>(query?: { page?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (query?.page) params.set("page", String(query.page));
      if (query?.limit) params.set("limit", String(query.limit));
      const suffix = params.toString();
      return request<TResponse>(suffix ? `/orders?${suffix}` : "/orders");
    },
    byId: <TResponse>(orderId: string) => request<TResponse>(`/orders/${encodeURIComponent(orderId)}`)
  },
  admin: {
    homepage: {
      list: <TResponse>() => request<TResponse>("/admin/homepage"),
      update: <TResponse, TBody>(key: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/homepage/${encodeURIComponent(key)}`, {
          method: "PATCH",
          body: payload
        })
    },
    orders: {
      list: <TResponse>(query?: {
        page?: number;
        limit?: number;
        status?: string;
        email?: string;
        dateFrom?: string;
        dateTo?: string;
      }) => {
        const params = new URLSearchParams();
        if (query?.page) params.set("page", String(query.page));
        if (query?.limit) params.set("limit", String(query.limit));
        if (query?.status) params.set("status", query.status);
        if (query?.email) params.set("email", query.email);
        if (query?.dateFrom) params.set("dateFrom", query.dateFrom);
        if (query?.dateTo) params.set("dateTo", query.dateTo);
        const suffix = params.toString();
        return request<TResponse>(suffix ? `/admin/orders?${suffix}` : "/admin/orders");
      },
      byId: <TResponse>(id: string) => request<TResponse>(`/admin/orders/${encodeURIComponent(id)}`),
      updateStatus: <TResponse, TBody>(id: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/orders/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          body: payload
        })
    },
    reviews: {
      list: <TResponse>(query?: {
        page?: number;
        limit?: number;
        isApproved?: boolean;
        productId?: string;
      }) => {
        const params = new URLSearchParams();
        if (query?.page) params.set("page", String(query.page));
        if (query?.limit) params.set("limit", String(query.limit));
        if (typeof query?.isApproved === "boolean") {
          params.set("isApproved", String(query.isApproved));
        }
        if (query?.productId) params.set("productId", query.productId);
        const suffix = params.toString();
        return request<TResponse>(suffix ? `/admin/reviews?${suffix}` : "/admin/reviews");
      },
      approve: <TResponse>(id: string) =>
        request<TResponse>(`/admin/reviews/${encodeURIComponent(id)}/approve`, {
          method: "PATCH"
        }),
      delete: <TResponse>(id: string) =>
        request<TResponse>(`/admin/reviews/${encodeURIComponent(id)}`, {
          method: "DELETE"
        })
    },
    categories: {
      list: <TResponse>() => request<TResponse>("/admin/categories"),
      create: <TResponse, TBody>(payload: TBody) =>
        request<TResponse, TBody>("/admin/categories", {
          method: "POST",
          body: payload
        }),
      update: <TResponse, TBody>(id: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/categories/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: payload
        }),
      delete: <TResponse>(id: string) =>
        request<TResponse>(`/admin/categories/${encodeURIComponent(id)}`, {
          method: "DELETE"
        })
    },
    coupons: {
      list: <TResponse>(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
        const params = new URLSearchParams();
        if (query?.page) params.set("page", String(query.page));
        if (query?.limit) params.set("limit", String(query.limit));
        if (query?.search) params.set("search", query.search);
        if (typeof query?.isActive === "boolean") params.set("isActive", String(query.isActive));
        const suffix = params.toString();
        return request<TResponse>(suffix ? `/admin/coupons?${suffix}` : "/admin/coupons");
      },
      create: <TResponse, TBody>(payload: TBody) =>
        request<TResponse, TBody>("/admin/coupons", {
          method: "POST",
          body: payload
        }),
      update: <TResponse, TBody>(id: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/coupons/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: payload
        }),
      delete: <TResponse>(id: string) =>
        request<TResponse>(`/admin/coupons/${encodeURIComponent(id)}`, {
          method: "DELETE"
        })
    },
    products: {
      list: <TResponse>(query?: Record<string, string | number | boolean | undefined>) => {
        const params = new URLSearchParams();
        if (query) {
          for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) {
              params.set(key, String(value));
            }
          }
        }

        const suffix = params.toString();
        return request<TResponse>(suffix ? `/admin/products?${suffix}` : "/admin/products");
      },
      byId: <TResponse>(id: string) => request<TResponse>(`/admin/products/${encodeURIComponent(id)}`),
      create: <TResponse, TBody>(payload: TBody) =>
        request<TResponse, TBody>("/admin/products", {
          method: "POST",
          body: payload
        }),
      update: <TResponse, TBody>(id: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/products/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: payload
        }),
      softDelete: <TResponse>(id: string) =>
        request<TResponse>(`/admin/products/${encodeURIComponent(id)}`, {
          method: "DELETE"
        }),
      createVariant: <TResponse, TBody>(productId: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/products/${encodeURIComponent(productId)}/variants`, {
          method: "POST",
          body: payload
        }),
      updateVariant: <TResponse, TBody>(productId: string, variantId: string, payload: TBody) =>
        request<TResponse, TBody>(
          `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
          {
            method: "PATCH",
            body: payload
          }
        ),
      softDeleteVariant: <TResponse>(productId: string, variantId: string) =>
        request<TResponse>(`/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`, {
          method: "DELETE"
        })
    },
    uploads: {
      uploadImage: <TResponse>(file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return request<TResponse, FormData>("/admin/uploads/image", {
          method: "POST",
          body: formData
        });
      },
      deleteImage: <TResponse>(publicId: string) =>
        request<TResponse, { publicId: string }>("/admin/uploads/image", {
          method: "DELETE",
          body: { publicId }
        })
    }
  },
  reviews: {
    list: <TResponse>(query?: { productId?: string; page?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (query?.productId) params.set("productId", query.productId);
      if (query?.page) params.set("page", String(query.page));
      if (query?.limit) params.set("limit", String(query.limit));
      const suffix = params.toString();
      return request<TResponse>(suffix ? `/reviews?${suffix}` : "/reviews");
    },
    create: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/reviews", {
        method: "POST",
        body: payload
      })
  }
};
