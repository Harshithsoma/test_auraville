const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "auraville_csrf_token";
const CSRF_STORAGE_KEY = "auraville_csrf_token";
const FALLBACK_CSRF_COOKIE_NAMES = ["auraville_csrf_token", "csrf_token", "XSRF-TOKEN"];

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
let csrfToken: string | null = null;
let authInvalidationHandler: (() => void) | null = null;

export function setAuthInvalidationHandler(handler: (() => void) | null): void {
  authInvalidationHandler = handler;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function readStorageCsrfToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(CSRF_STORAGE_KEY);
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStorageCsrfToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token && token.trim().length > 0) {
      window.localStorage.setItem(CSRF_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(CSRF_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}

function resolveCsrfTokenFromCookies(): string | null {
  const cookieNames = [CSRF_COOKIE_NAME, ...FALLBACK_CSRF_COOKIE_NAMES].filter(Boolean);
  for (const cookieName of cookieNames) {
    const value = readCookieValue(cookieName);
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function getCsrfTokenForRequest(): string | null {
  if (csrfToken && csrfToken.trim().length > 0) {
    return csrfToken;
  }

  const fromCookie = resolveCsrfTokenFromCookies();
  if (fromCookie) {
    csrfToken = fromCookie;
    writeStorageCsrfToken(fromCookie);
    return fromCookie;
  }

  const fromStorage = readStorageCsrfToken();
  if (fromStorage) {
    csrfToken = fromStorage;
    return fromStorage;
  }

  return null;
}

function syncCsrfTokenFromResponse(response: Response): void {
  const fromHeader = response.headers.get("x-csrf-token") ?? response.headers.get("X-CSRF-Token");
  if (fromHeader && fromHeader.trim().length > 0) {
    csrfToken = fromHeader.trim();
    writeStorageCsrfToken(csrfToken);
    return;
  }

  const fromCookie = resolveCsrfTokenFromCookies();
  if (fromCookie) {
    csrfToken = fromCookie;
    writeStorageCsrfToken(fromCookie);
  }
}

export function clearCsrfToken(): void {
  csrfToken = null;
  writeStorageCsrfToken(null);
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

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }

  return null;
}

function isMutatingMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
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
  method: string;
}): Headers {
  const headers = new Headers(params.headers);
  const token = params.authToken ?? accessToken;

  if (params.body !== undefined && !(params.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (isMutatingMethod(params.method) && !headers.has("X-CSRF-Token")) {
    const token = getCsrfTokenForRequest();
    if (token) {
      headers.set("X-CSRF-Token", token);
    }
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
        clearCsrfToken();
        if (authInvalidationHandler) {
          try {
            authInvalidationHandler();
          } catch {
            // Keep auth failure handling non-fatal.
          }
        }
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
  const isDev = process.env.NODE_ENV !== "production";
  const shouldDebug = isDev && path.startsWith("/admin");

  const makeRequest = async (): Promise<Response> => {
    const payloadBody = body instanceof FormData ? body : toJsonBody(body);
    const method = (rest.method ?? "GET").toUpperCase();

    return fetch(withBaseUrl(path), {
      ...rest,
      credentials: "include",
      headers: buildHeaders({ body, headers, authToken, method }),
      body: payloadBody
    });
  };

  let response = await makeRequest();
  syncCsrfTokenFromResponse(response);

  if (response.status === 401 && retryOn401 && path !== "/auth/refresh") {
    await refreshAccessToken();
    response = await makeRequest();
    syncCsrfTokenFromResponse(response);
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    if (shouldDebug) {
      console.debug("[admin-api] request failed", {
        path,
        method: rest.method ?? "GET",
        status: response.status
      });
    }
    throw toApiError(response, payload);
  }

  if (shouldDebug) {
    console.debug("[admin-api] request success", {
      path,
      method: rest.method ?? "GET",
      status: response.status
    });
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
        cache: "no-store"
      });
    },
    bySlug: <TResponse>(slug: string) =>
      request<TResponse>(`/products/${encodeURIComponent(slug)}`, {
        cache: "no-store"
      }),
    notifyMe: <TResponse>(productId: string) =>
      request<TResponse>(`/products/${encodeURIComponent(productId)}/notify-me`, {
        method: "POST"
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
    list: <TResponse>() =>
      request<TResponse>("/coupons", {
        next: { revalidate: 60 }
      }),
    available: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/coupons/available", {
        method: "POST",
        body: payload
      }),
    validate: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/coupons/validate", {
        method: "POST",
        body: payload
      })
  },
  homepage: {
    list: <TResponse>() =>
      request<TResponse>("/homepage", {
        next: { revalidate: 60 }
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
    forgotPasswordSend: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/password/forgot/send", {
        method: "POST",
        body: payload,
        retryOn401: false
      }),
    forgotPasswordReset: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/auth/password/forgot/reset", {
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
  account: {
    addresses: {
      list: <TResponse>() => request<TResponse>("/account/addresses"),
      create: <TResponse, TBody>(payload: TBody) =>
        request<TResponse, TBody>("/account/addresses", {
          method: "POST",
          body: payload
        }),
      update: <TResponse, TBody>(id: string, payload: TBody) =>
        request<TResponse, TBody>(`/account/addresses/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: payload
        }),
      remove: <TResponse>(id: string) =>
        request<TResponse>(`/account/addresses/${encodeURIComponent(id)}`, {
          method: "DELETE"
        }),
      setDefault: <TResponse>(id: string) =>
        request<TResponse>(`/account/addresses/${encodeURIComponent(id)}/default`, {
          method: "PATCH"
        })
    },
    updatePassword: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/account/password", {
        method: "PATCH",
        body: payload
      })
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
        }),
      updateFulfillmentStage: <TResponse, TBody>(id: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/orders/${encodeURIComponent(id)}/fulfillment-stage`, {
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
        }),
      deletePermanent: <TResponse>(id: string) =>
        request<TResponse>(`/admin/coupons/${encodeURIComponent(id)}/permanent`, {
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
      hardDelete: <TResponse, TBody>(id: string, payload: TBody) =>
        request<TResponse, TBody>(`/admin/products/${encodeURIComponent(id)}/permanent`, {
          method: "DELETE",
          body: payload
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
        }),
      hardDeleteVariant: <TResponse, TBody>(productId: string, variantId: string, payload: TBody) =>
        request<TResponse, TBody>(
          `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/permanent`,
          {
            method: "DELETE",
            body: payload
          }
        )
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
      }),
    verifiedPrompt: <TResponse>() =>
      request<TResponse>("/reviews/verified/prompt"),
    verifiedRate: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/reviews/verified/rate", {
        method: "POST",
        body: payload
      }),
    verifiedText: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/reviews/verified/text", {
        method: "PATCH",
        body: payload
      }),
    verifiedFromLink: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/reviews/verified/from-link", {
        method: "POST",
        body: payload
      }),
    verifiedFromLinkText: <TResponse, TBody>(payload: TBody) =>
      request<TResponse, TBody>("/reviews/verified/from-link/text", {
        method: "PATCH",
        body: payload
      })
  }
};
