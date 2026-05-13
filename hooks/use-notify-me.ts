"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

type NotifyProductInput = {
  id: string;
  slug: string;
};

type NotifyMessageResponse = {
  data: {
    message: string;
  };
};

type UseNotifyMeParams = {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

function toAuthRedirectPath(product: NotifyProductInput): string {
  const nextPath = `/product/${product.slug}?notify=1&notifyProductId=${encodeURIComponent(product.id)}`;
  return `/auth?next=${encodeURIComponent(nextPath)}`;
}

function getFriendlyNotifyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "PRODUCT_ALREADY_IN_STOCK") {
      return "This product is already in stock.";
    }

    return error.message;
  }

  return "Unable to save your notify request right now. Please try again.";
}

export function useNotifyMe(params: UseNotifyMeParams = {}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notify = async (
    product: NotifyProductInput,
    options?: {
      redirectGuest?: boolean;
    }
  ): Promise<{ ok: boolean; message: string }> => {
    const shouldRedirectGuest = options?.redirectGuest !== false;

    if (!user) {
      const message = "Please login to get stock alerts.";
      params.onError?.(message);
      if (shouldRedirectGuest) {
        router.push(toAuthRedirectPath(product));
      }
      return { ok: false, message };
    }

    setIsSubmitting(true);

    try {
      const response = await commerceApi.products.notifyMe<NotifyMessageResponse>(product.id);
      const message = response.data.message;
      params.onSuccess?.(message);
      return { ok: true, message };
    } catch (error) {
      const message = getFriendlyNotifyError(error);
      params.onError?.(message);
      return { ok: false, message };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    notify,
    isSubmitting
  };
}
