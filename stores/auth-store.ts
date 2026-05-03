"use client";

import { create } from "zustand";
import { commerceApi, setAccessToken } from "@/services/api";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
};

type AuthState = {
  user: AuthUser | null;
  isHydrating: boolean;
  hasHydrated: boolean;
  completeAuth: (params: { user: AuthUser; accessToken: string }) => void;
  hydrateSession: () => Promise<void>;
  logout: () => Promise<void>;
};

type AuthResponse = {
  data: {
    user: AuthUser;
    accessToken: string;
  };
};

let hydrationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrating: false,
  hasHydrated: false,
  completeAuth: ({ user, accessToken }) => {
    setAccessToken(accessToken);
    set({ user, hasHydrated: true, isHydrating: false });
  },
  hydrateSession: async () => {
    if (hydrationPromise) {
      await hydrationPromise;
      return;
    }

    hydrationPromise = (async () => {
      set({ isHydrating: true });
      try {
        const response = await commerceApi.auth.refresh<AuthResponse>();
        setAccessToken(response.data.accessToken);
        set({ user: response.data.user, hasHydrated: true, isHydrating: false });
      } catch {
        setAccessToken(null);
        set({ user: null, hasHydrated: true, isHydrating: false });
      }
    })().finally(() => {
      hydrationPromise = null;
    });

    await hydrationPromise;
  },
  logout: async () => {
    try {
      await commerceApi.auth.logout<{ data?: { ok?: boolean } }>();
    } catch {
      // Clear client session even if server logout fails.
    } finally {
      setAccessToken(null);
      set({ user: null, hasHydrated: true, isHydrating: false });
    }
  }
}));
