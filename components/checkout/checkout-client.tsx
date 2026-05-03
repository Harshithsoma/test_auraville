"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useCartPricing } from "@/hooks/use-cart-pricing";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";

type CheckoutErrors = Partial<
  Record<"name" | "email" | "phone" | "address" | "city" | "state" | "country" | "pincode", string>
>;

type CheckoutOrderResponse = {
  data: {
    order: {
      id: string;
      email: string;
      total: number;
      status: string;
      createdAt: string;
    };
    pricing: {
      subtotal: number;
      promoDiscount: number;
      gst: number;
      shipping: number;
      total: number;
    };
    razorpay: {
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
    };
  };
};

type VerifyPaymentResponse = {
  data: {
    orderId: string;
    status: "confirmed";
    paymentStatus: "paid";
  };
};

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessPayload) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  }).finally(() => {
    razorpayScriptPromise = null;
  });

  return razorpayScriptPromise;
}

function validate(formData: FormData): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();

  for (const field of ["name", "address", "city", "state", "country"] as const) {
    if (!String(formData.get(field) ?? "").trim()) errors[field] = "Required";
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email";
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Enter a valid 10-digit Indian mobile number";
  if (!/^\d{6}$/.test(pincode)) errors.pincode = "Enter a valid 6-digit pincode";

  return errors;
}

export default function CheckoutClient() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const promoCode = useCartStore((state) => state.promoCode);
  const user = useAuthStore((state) => state.user);
  const { summary, enrichedItems, pricingError, isBackendPricing, isPricingLoading } = useCartPricing();

  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return items.length > 0 && !isSubmitting;
  }, [isSubmitting, items.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextErrors = validate(formData);
    setErrors(nextErrors);
    setCheckoutError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!isBackendPricing) {
      setCheckoutError("Live cart pricing is required before payment. Please retry in a moment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderResponse = await commerceApi.checkout.createOrder<
        CheckoutOrderResponse,
        {
          items: Array<{ productId: string; variantId: string; quantity: number }>;
          promoCode?: string;
          customer: {
            name: string;
            email: string;
            phone: string;
          };
          shippingAddress: {
            addressLine1: string;
            addressLine2?: string;
            city: string;
            state: string;
            pincode: string;
            country: string;
          };
        }
      >({
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        })),
        promoCode: promoCode ?? undefined,
        customer: {
          name: String(formData.get("name") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          phone: String(formData.get("phone") ?? "").trim()
        },
        shippingAddress: {
          addressLine1: String(formData.get("address") ?? "").trim(),
          addressLine2: String(formData.get("addressLine2") ?? "").trim() || undefined,
          city: String(formData.get("city") ?? "").trim(),
          state: String(formData.get("state") ?? "").trim(),
          pincode: String(formData.get("pincode") ?? "").trim(),
          country: String(formData.get("country") ?? "").trim()
        }
      });

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        setCheckoutError("Unable to load payment gateway. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const { order, razorpay } = orderResponse.data;

      const options: RazorpayCheckoutOptions = {
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        name: razorpay.name,
        description: razorpay.description,
        order_id: razorpay.orderId,
        prefill: {
          name: String(formData.get("name") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          contact: String(formData.get("phone") ?? "").trim()
        },
        modal: {
          ondismiss: () => {
            setCheckoutError("Payment was cancelled. Your cart is still saved.");
            setIsSubmitting(false);
          }
        },
        handler: async (response) => {
          try {
            await commerceApi.payments.verify<
              VerifyPaymentResponse,
              {
                orderId: string;
                razorpayOrderId: string;
                razorpayPaymentId: string;
                razorpaySignature: string;
              }
            >({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            clearCart();
            sessionStorage.setItem(
              "auraville-last-order-reference",
              JSON.stringify({
                id: order.id,
                total: orderResponse.data.pricing.total
              })
            );
            router.push(`/order-success?order=${encodeURIComponent(order.id)}`);
          } catch (verifyError) {
            if (verifyError instanceof ApiError) {
              setCheckoutError(verifyError.message);
            } else {
              setCheckoutError("Payment verification failed. Your cart is still saved.");
            }
            setIsSubmitting(false);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", () => {
        setCheckoutError("Payment failed. Please try again.");
        setIsSubmitting(false);
      });
      razorpayInstance.open();
    } catch (error) {
      if (error instanceof ApiError) {
        setCheckoutError(error.message);
      } else {
        setCheckoutError("Unable to create order right now. Please try again.");
      }
      setIsSubmitting(false);
    }
  }

  if (!hasMounted) {
    return <div className="rounded-lg border border-[var(--line)] bg-white p-8">Preparing checkout...</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <form
        className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-8"
        noValidate
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-semibold">Delivery address</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Full name</span>
            <Input className="mt-2" name="name" autoComplete="name" defaultValue={user?.name ?? ""} aria-invalid={Boolean(errors.name)} />
            {errors.name ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.name}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <Input className="mt-2" name="email" type="email" autoComplete="email" defaultValue={user?.email ?? ""} aria-invalid={Boolean(errors.email)} />
            {errors.email ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.email}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Mobile number</span>
            <Input className="mt-2" name="phone" inputMode="numeric" autoComplete="tel" defaultValue={user?.phone ?? ""} aria-invalid={Boolean(errors.phone)} />
            {errors.phone ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.phone}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">City</span>
            <Input className="mt-2" name="city" autoComplete="address-level2" aria-invalid={Boolean(errors.city)} />
            {errors.city ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.city}</span> : null}
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold">Address</span>
            <Textarea className="mt-2" name="address" autoComplete="street-address" aria-invalid={Boolean(errors.address)} />
            {errors.address ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.address}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">State</span>
            <Input className="mt-2" name="state" autoComplete="address-level1" aria-invalid={Boolean(errors.state)} />
            {errors.state ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.state}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Country</span>
            <Input className="mt-2" name="country" autoComplete="country-name" defaultValue="India" aria-invalid={Boolean(errors.country)} />
            {errors.country ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.country}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Pincode</span>
            <Input className="mt-2" name="pincode" inputMode="numeric" autoComplete="postal-code" aria-invalid={Boolean(errors.pincode)} />
            {errors.pincode ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.pincode}</span> : null}
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold">Address line 2 (optional)</span>
            <Input className="mt-2" name="addressLine2" autoComplete="address-line2" />
          </label>
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-[var(--line)] bg-[var(--mint)] p-5">
          <h3 className="font-semibold">Payment</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            You will be redirected to Razorpay after we create a secure backend order.
          </p>
        </div>

        {checkoutError ? (
          <p className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] px-3 py-2 text-sm font-semibold text-[var(--coral)]">
            {checkoutError}
          </p>
        ) : null}

        <Button className="mt-8 w-full sm:w-auto" disabled={!canSubmit || isPricingLoading} type="submit">
          {isSubmitting ? "Processing payment..." : "Place secure order"}
        </Button>
      </form>

      <aside className="h-fit rounded-lg border border-[var(--line)] bg-white p-6 lg:sticky lg:top-28">
        <h2 className="text-xl font-semibold">Order summary</h2>
        {pricingError ? (
          <p className="mt-3 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] px-3 py-2 text-xs font-semibold text-[var(--coral)]">
            {pricingError}
          </p>
        ) : null}
        {!isBackendPricing ? (
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-xs text-[var(--muted)]">
            Live backend pricing is unavailable. Please refresh before paying.
          </p>
        ) : null}
        <ul className="mt-5 space-y-4">
          {enrichedItems.length > 0 ? (
            enrichedItems.map((item) => (
              <li className="flex justify-between gap-4 text-sm" key={`${item.productId}-${item.variantId}`}>
                <span className="text-[var(--muted)]">
                  {item.quantity} x {item.name} ({item.variantLabel})
                </span>
                <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-[var(--muted)]">Your cart is empty.</li>
          )}
        </ul>
        <dl className="mt-6 space-y-4 border-t border-[var(--line)] pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Subtotal</dt>
            <dd className="font-semibold">{formatPrice(summary.subtotal)}</dd>
          </div>
          {summary.promoDiscount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Promo ({summary.promoCode ?? promoCode})</dt>
              <dd className="font-semibold text-[var(--leaf-deep)]">- {formatPrice(summary.promoDiscount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">GST</dt>
            <dd className="font-semibold">{formatPrice(summary.gst)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Shipping</dt>
            <dd className="font-semibold">{summary.shipping ? formatPrice(summary.shipping) : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t border-[var(--line)] pt-4 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatPrice(summary.total)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
