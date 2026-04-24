"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/product";

type CartState = {
  items: CartItem[];
  isDrawerOpen: boolean;
  cartNotice: string | null;
  cartNoticeKey: number;
  cartNoticePending: boolean;
  promoCode: string | null;
  promoDiscountPercent: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  applyPromoCode: (code: string) => { ok: boolean; message: string };
  clearPromoCode: () => void;
  pushCartNotice: (message: string) => void;
  consumeCartNotice: () => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

type PersistedCartState = Pick<CartState, "items" | "promoCode" | "promoDiscountPercent">;

function itemKey(item: Pick<CartItem, "productId" | "variantId">) {
  return `${item.productId}:${item.variantId}`;
}

const promoRules: Record<string, number> = {
  AURA10: 10,
  PALMYRA15: 15
};

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], PersistedCartState>(
    (set) => ({
      items: [],
      isDrawerOpen: false,
      cartNotice: null,
      cartNoticeKey: 0,
      cartNoticePending: false,
      promoCode: null,
      promoDiscountPercent: 0,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((cartItem) => itemKey(cartItem) === itemKey(item));
          const message = existing ? `${item.name} quantity updated` : `${item.name} added to cart`;

          if (!existing) {
            return {
              items: [...state.items, item],
              cartNotice: message,
              cartNoticeKey: state.cartNoticeKey + 1,
              cartNoticePending: true
            };
          }

          return {
            items: state.items.map((cartItem) =>
              itemKey(cartItem) === itemKey(item)
                ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
                : cartItem
            ),
            cartNotice: message,
            cartNoticeKey: state.cartNoticeKey + 1,
            cartNoticePending: true
          };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((cartItem) => itemKey(cartItem) !== `${productId}:${variantId}`),
          cartNotice: null,
          cartNoticePending: false
        })),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          const itemToUpdate = state.items.find(
            (cartItem) => itemKey(cartItem) === `${productId}:${variantId}`
          );
          const nextQuantity = Math.max(1, quantity);
          const isIncrease = Boolean(itemToUpdate && nextQuantity > itemToUpdate.quantity);

          return {
            items: state.items.map((cartItem) =>
              itemKey(cartItem) === `${productId}:${variantId}`
                ? { ...cartItem, quantity: nextQuantity }
                : cartItem
            ),
            cartNotice: isIncrease && itemToUpdate ? `${itemToUpdate.name} quantity updated` : null,
            cartNoticeKey: isIncrease ? state.cartNoticeKey + 1 : state.cartNoticeKey,
            cartNoticePending: isIncrease
          };
        }),
      applyPromoCode: (code) => {
        const normalizedCode = code.trim().toUpperCase();
        const discount = promoRules[normalizedCode];
        if (!discount) {
          return { ok: false, message: "Invalid promo code" };
        }

        set({
          promoCode: normalizedCode,
          promoDiscountPercent: discount
        });
        return { ok: true, message: `Promo ${normalizedCode} applied` };
      },
      clearPromoCode: () =>
        set({
          promoCode: null,
          promoDiscountPercent: 0
        }),
      pushCartNotice: (message) =>
        set((state) => ({
          cartNotice: message,
          cartNoticeKey: state.cartNoticeKey + 1,
          cartNoticePending: true
        })),
      consumeCartNotice: () =>
        set({
          cartNotice: null,
          cartNoticePending: false
        }),
      clearCart: () =>
        set({ items: [], promoCode: null, promoDiscountPercent: 0, cartNotice: null, cartNoticePending: false }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false, cartNotice: null, cartNoticePending: false })
    }),
    {
      name: "auraville-cart",
      partialize: (state): PersistedCartState => ({
        items: state.items,
        promoCode: state.promoCode,
        promoDiscountPercent: state.promoDiscountPercent
      })
    }
  )
);

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function getCartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}
