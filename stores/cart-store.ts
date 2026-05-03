"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError, commerceApi } from "@/services/api";
import type { CartItem } from "@/types/product";

export type CartPricingItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  compareAtUnitPrice?: number;
  quantity: number;
  lineTotal: number;
  available: boolean;
  stock: number;
};

export type CartPricingSummary = {
  originalSubtotal: number;
  subtotal: number;
  baseSavings: number;
  promoCode: string | null;
  promoDiscount: number;
  discountedSubtotal: number;
  gst: number;
  shipping: number;
  total: number;
  totalSavings: number;
  freeShippingThreshold: number;
  remainingForFreeShipping: number;
};

export type CartPricingData = {
  items: CartPricingItem[];
  summary: CartPricingSummary;
};

type CartPriceRequest = {
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  promoCode?: string;
};

type CartPriceResponse = {
  data: CartPricingData;
};

type CouponValidateResponse = {
  data: {
    ok: true;
    code: string;
    discountType: "PERCENT" | "FLAT";
    discountValue: number;
    discountAmount: number;
    message: string;
  };
};

type CartState = {
  items: CartItem[];
  isDrawerOpen: boolean;
  cartNotice: string | null;
  cartNoticeKey: number;
  cartNoticePending: boolean;
  promoCode: string | null;
  promoDiscountPercent: number;
  pricing: CartPricingData | null;
  pricingError: string | null;
  isPricingLoading: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  applyPromoCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  clearPromoCode: () => Promise<void>;
  syncPricing: () => Promise<void>;
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

let syncPricingPromise: Promise<void> | null = null;
let syncPricingKey: string | null = null;

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], PersistedCartState>(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      cartNotice: null,
      cartNoticeKey: 0,
      cartNoticePending: false,
      promoCode: null,
      promoDiscountPercent: 0,
      pricing: null,
      pricingError: null,
      isPricingLoading: false,
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
          cartNoticePending: false,
          pricingError: null
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
            cartNoticePending: isIncrease,
            pricingError: null
          };
        }),
      applyPromoCode: async (code) => {
        const { items } = get();
        const normalizedCode = code.trim().toUpperCase();

        if (!normalizedCode) {
          return { ok: false, message: "Invalid promo code" };
        }

        if (items.length === 0) {
          return { ok: false, message: "Add items before applying promo code" };
        }

        try {
          const response = await commerceApi.coupons.validate<
            CouponValidateResponse,
            {
              code: string;
              items: Array<{ productId: string; variantId: string; quantity: number }>;
            }
          >({
            code: normalizedCode,
            items: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity
            }))
          });

          set({
            promoCode: normalizedCode,
            promoDiscountPercent:
              response.data.discountType === "PERCENT" ? response.data.discountValue : 0,
            pricingError: null
          });
          await get().syncPricing();
          return { ok: true, message: response.data.message };
        } catch (error) {
          if (error instanceof ApiError) {
            return { ok: false, message: error.message };
          }
          return { ok: false, message: "Unable to validate promo code right now." };
        }
      },
      clearPromoCode: async () => {
        set({
          promoCode: null,
          promoDiscountPercent: 0,
          pricingError: null
        });
        await get().syncPricing();
      },
      syncPricing: async () => {
        const state = get();
        const payloadItems = state.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        }));

        if (payloadItems.length === 0) {
          set({
            pricing: null,
            pricingError: null,
            isPricingLoading: false
          });
          return;
        }

        const key = JSON.stringify({
          items: payloadItems,
          promoCode: state.promoCode
        });

        if (syncPricingPromise && syncPricingKey === key) {
          await syncPricingPromise;
          return;
        }

        set({ isPricingLoading: true, pricingError: null });
        syncPricingKey = key;
        syncPricingPromise = (async () => {
          try {
            const response = await commerceApi.cart.price<CartPriceResponse, CartPriceRequest>({
              items: payloadItems,
              promoCode: state.promoCode ?? undefined
            });

            set({
              pricing: response.data,
              promoCode: response.data.summary.promoCode,
              pricingError: null,
              isPricingLoading: false
            });
          } catch (error) {
            if (error instanceof ApiError) {
              if (error.code === "INVALID_COUPON") {
                set({
                  promoCode: null,
                  promoDiscountPercent: 0
                });
              }
              set({
                pricingError: error.message,
                isPricingLoading: false
              });
              return;
            }

            set({
              pricingError: "Unable to refresh cart pricing right now.",
              isPricingLoading: false
            });
          }
        })().finally(() => {
          syncPricingPromise = null;
        });

        await syncPricingPromise;
      },
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
        set({
          items: [],
          promoCode: null,
          promoDiscountPercent: 0,
          pricing: null,
          pricingError: null,
          isPricingLoading: false,
          cartNotice: null,
          cartNoticePending: false
        }),
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
