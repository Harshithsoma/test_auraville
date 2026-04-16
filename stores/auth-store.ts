"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthUser = {
  email: string;
  name?: string;
};

type AuthState = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null })
    }),
    {
      name: "auraville-auth",
      partialize: (state) => ({ user: state.user })
    }
  )
);
