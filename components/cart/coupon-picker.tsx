"use client";

import { useEffect, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { formatPrice } from "@/components/ui/price";

type CouponPickerProps = {
  items: Array<{ productId: string; variantId: string; quantity: number }>;
  promoCode: string | null;
  isPricingLoading: boolean;
  pricingError: string | null;
  onApplyPromoCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  onClearPromoCode: () => Promise<void>;
};

type AvailableCoupon = {
  code: string;
  description: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  minOrderAmount: number | null;
  isEligible: boolean;
  eligibilityReason: string | null;
  displayText: string;
  isActive: boolean;
  expiryDate: string | null;
};

type AvailableCouponsResponse = {
  data: AvailableCoupon[];
};

export function CouponPicker({
  items,
  promoCode,
  isPricingLoading,
  pricingError,
  onApplyPromoCode,
  onClearPromoCode,
}: CouponPickerProps) {
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingCoupons, setIsFetchingCoupons] = useState(false);
  const [coupons, setCoupons] = useState<AvailableCoupon[]>([]);
  const [couponsError, setCouponsError] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);

  function clearLocalMessages() {
    setPromoError("");
    setPromoMessage("");
    setCouponsError("");
    setActiveCode(null);
  }

  function closeModal() {
    setIsModalOpen(false);
    clearLocalMessages();
  }

  async function loadAvailableCoupons() {
    if (items.length === 0) {
      setCoupons([]);
      return;
    }

    setIsFetchingCoupons(true);
    setCouponsError("");
    try {
      const response = await commerceApi.coupons.available<
        AvailableCouponsResponse,
        {
          items: Array<{
            productId: string;
            variantId: string;
            quantity: number;
          }>;
        }
      >({
        items,
      });
      setCoupons(response.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setCouponsError(error.message);
      } else {
        setCouponsError("Unable to load coupons right now.");
      }
    } finally {
      setIsFetchingCoupons(false);
    }
  }

  async function openCouponPicker() {
    clearLocalMessages();
    setIsModalOpen(true);
    await loadAvailableCoupons();
  }

  useEffect(() => {
    if (!promoCode) {
      setPromoMessage("");
    }
  }, [promoCode]);

  useEffect(() => {
    if (items.length > 0) return;
    setPromoInput("");
    setPromoError("");
    setPromoMessage("");
    setCouponsError("");
    setActiveCode(null);
    setCoupons([]);
    setIsModalOpen(false);
  }, [items.length]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false);
        clearLocalMessages();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

  async function applyCode(code: string, closeAfterApply = false) {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setPromoError("Enter a promo code");
      return;
    }

    if (promoCode && promoCode.toUpperCase() === normalizedCode) {
      setPromoError("This coupon is already applied");
      return;
    }

    setActiveCode(normalizedCode);
    setPromoError("");
    setPromoMessage("");
    const result = await onApplyPromoCode(normalizedCode);
    setActiveCode(null);

    if (!result.ok) {
      setPromoError(result.message);
      return;
    }

    setPromoInput("");
    setPromoMessage(result.message);
    if (closeAfterApply) {
      closeModal();
    } else if (isModalOpen) {
      await loadAvailableCoupons();
    }
  }

  async function removeCoupon() {
    clearLocalMessages();
    await onClearPromoCode();
  }

  const hasItems = items.length > 0;
  const hasAppliedCoupon = hasItems && Boolean(promoCode);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Promo code
        </p>
        <button
          className="focus-ring inline-flex h-8 items-center justify-center rounded-lg border border-[#ce6f6a] bg-[#fff1f0] px-3 text-xs font-semibold text-[#a84843] transition hover:bg-[#ffe8e6] active:scale-95 disabled:cursor-not-allowed disabled:opacity-55"
          type="button"
          disabled={!hasItems}
          onClick={() => {
            void openCouponPicker();
          }}
        >
          {hasAppliedCoupon ? "Change Coupon" : "Coupons"}
        </button>
      </div>

      {hasAppliedCoupon ? (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2">
          <p className="text-sm font-semibold">{promoCode} · Coupon Applied</p>
          <button
            className="focus-ring rounded text-xs font-semibold text-[var(--coral)]"
            type="button"
            disabled={isPricingLoading}
            onClick={() => {
              void removeCoupon();
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      {hasItems ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            className="focus-ring h-10 min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 text-sm"
            placeholder="Enter promo code"
            type="text"
            value={promoInput}
            onChange={(event) => {
              setPromoInput(event.target.value);
              setPromoError("");
              setPromoMessage("");
            }}
          />
          <button
            className="focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-[var(--leaf)] px-3 text-xs font-semibold text-[var(--leaf-deep)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isPricingLoading || Boolean(activeCode)}
            onClick={() => {
              void applyCode(promoInput);
            }}
          >
            {activeCode && activeCode === promoInput.trim().toUpperCase()
              ? "Applying..."
              : "Apply"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Add items to use coupons.
        </p>
      )}

      {promoError ? (
        <p className="mt-2 text-xs font-semibold text-[var(--coral)]">
          {promoError}
        </p>
      ) : null}
      {!promoError && promoMessage ? (
        <p className="mt-2 text-xs font-semibold text-[var(--leaf-deep)]">
          {promoMessage}
        </p>
      ) : null}
      {pricingError ? (
        <p className="mt-2 text-xs font-semibold text-[var(--coral)]">
          {pricingError}
        </p>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-[170]">
          <button
            aria-label="Close coupon picker"
            className="absolute inset-0 bg-black/40"
            type="button"
            onClick={closeModal}
          />
          <section className="absolute bottom-0 left-0 right-0 max-h-[72vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 md:bottom-auto md:left-auto md:right-6 md:top-20 md:w-[430px] md:max-h-[75vh] md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Available coupons</h3>
              <button
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-lg"
                type="button"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Add items to view available coupons.
              </p>
            ) : null}
            {isFetchingCoupons ? (
              <p className="text-sm text-[var(--muted)]">Loading coupons...</p>
            ) : null}
            {couponsError ? (
              <p className="rounded-lg border border-[#e7c9c6] bg-[#fff7f7] px-3 py-2 text-xs font-semibold text-[var(--coral)]">
                {couponsError}
              </p>
            ) : null}
            {!isFetchingCoupons &&
            !couponsError &&
            items.length > 0 &&
            coupons.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No coupons available right now.
              </p>
            ) : null}

            <div className="space-y-2">
              {coupons.map((coupon) => {
                const sameAsApplied = Boolean(
                  promoCode &&
                  promoCode.toUpperCase() === coupon.code.toUpperCase(),
                );
                const isApplying = activeCode === coupon.code;
                const disabled =
                  !coupon.isEligible ||
                  sameAsApplied ||
                  isPricingLoading ||
                  Boolean(activeCode);

                // const reason = coupon.eligibilityReason;
                const primaryDescription =
                  coupon.description?.trim() || coupon.displayText;
                // const metaParts: string[] = [];
                // if (coupon.minOrderAmount && coupon.minOrderAmount > 0) {
                //   metaParts.push(
                //     `Min order ${formatPrice(coupon.minOrderAmount)}`,
                //   );
                // }
                // if (coupon.expiryDate) {
                //   const expiryDate = new Date(coupon.expiryDate);
                //   if (!Number.isNaN(expiryDate.getTime())) {
                //     metaParts.push(
                //       `Expires ${expiryDate.toLocaleDateString()}`,
                //     );
                //   }
                // }

                return (
                  <article
                    className={`rounded-lg border px-3 py-3 ${
                      coupon.isEligible
                        ? "border-[var(--line)] bg-white"
                        : "border-[var(--line)] bg-[#f7f8f7] text-[var(--muted)]"
                    }`}
                    key={coupon.code}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{coupon.code}</p>
                        <p className="mt-1 text-xs">{primaryDescription}</p>
                      </div>
                      <button
                        className="focus-ring inline-flex h-8 items-center justify-center rounded-lg border border-[var(--leaf)] px-3 text-xs font-semibold text-[var(--leaf-deep)] transition disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          void applyCode(coupon.code, true);
                        }}
                      >
                        {sameAsApplied
                          ? "Applied"
                          : isApplying
                            ? "Applying..."
                            : "Apply"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
