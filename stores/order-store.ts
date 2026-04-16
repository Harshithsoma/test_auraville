"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/product";

export type StoredOrder = {
  id: string;
  email?: string;
  items: CartItem[];
  total: number;
  status: "pending" | "confirmed" | "delivered";
  createdAt: string;
};

type OrderState = {
  orders: StoredOrder[];
  addOrder: (order: StoredOrder) => void;
};

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders]
        }))
    }),
    {
      name: "auraville-orders",
      partialize: (state) => ({ orders: state.orders })
    }
  )
);
