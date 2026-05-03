"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function AuthSessionBootstrap() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);

  useEffect(() => {
    if (hasHydrated) {
      return;
    }

    void hydrateSession();
  }, [hasHydrated, hydrateSession]);

  return null;
}
