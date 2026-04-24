"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCartSubtotal, useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useOrderStore } from "@/stores/order-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";

type CheckoutErrors = Partial<Record<"name" | "email" | "phone" | "address" | "city" | "pincode", string>>;

function validate(formData: FormData): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const pincode = String(formData.get("pincode") ?? "");

  for (const field of ["name", "address", "city"] as const) {
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
  const { items, clearCart, promoCode, promoDiscountPercent } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const addOrder = useOrderStore((state) => state.addOrder);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const summary = useMemo(() => {
    const subtotal = getCartSubtotal(items);
    const promoDiscount = Math.round((subtotal * promoDiscountPercent) / 100);
    const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
    const tax = Math.round(discountedSubtotal * 0.05);
    const shipping = discountedSubtotal >= 1499 || discountedSubtotal === 0 ? 0 : 99;
    return { subtotal, promoDiscount, discountedSubtotal, tax, shipping, total: discountedSubtotal + tax + shipping };
  }, [items, promoDiscountPercent]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextErrors = validate(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const orderId = `AUR-${Date.now().toString().slice(-8)}`;
    const order = {
      id: orderId,
      email: user?.email ?? String(formData.get("email") ?? ""),
      items,
      total: summary.total,
      status: "confirmed" as const,
      createdAt: new Date().toISOString()
    };
    sessionStorage.setItem(
      "auraville-last-order",
      JSON.stringify(order)
    );
    addOrder(order);
    clearCart();
    router.push(`/order-success?order=${orderId}`);
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
            <Input className="mt-2" name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} />
            {errors.name ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.name}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <Input className="mt-2" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} />
            {errors.email ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.email}</span> : null}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Mobile number</span>
            <Input className="mt-2" name="phone" inputMode="numeric" autoComplete="tel" aria-invalid={Boolean(errors.phone)} />
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
            <span className="text-sm font-semibold">Pincode</span>
            <Input className="mt-2" name="pincode" inputMode="numeric" autoComplete="postal-code" aria-invalid={Boolean(errors.pincode)} />
            {errors.pincode ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.pincode}</span> : null}
          </label>
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-[var(--line)] bg-[var(--mint)] p-5">
          <h3 className="font-semibold">Payment</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Razorpay order creation will connect here once the backend endpoint is available.
          </p>
        </div>

        <Button className="mt-8 w-full sm:w-auto" disabled={items.length === 0 || isSubmitting} type="submit">
          {isSubmitting ? "Placing order..." : "Place secure order"}
        </Button>
      </form>

      <aside className="h-fit rounded-lg border border-[var(--line)] bg-white p-6 lg:sticky lg:top-28">
        <h2 className="text-xl font-semibold">Order summary</h2>
        <ul className="mt-5 space-y-4">
          {items.length > 0 ? (
            items.map((item) => (
              <li className="flex justify-between gap-4 text-sm" key={`${item.productId}-${item.variantId}`}>
                <span className="text-[var(--muted)]">
                  {item.quantity} x {item.name} ({item.variantLabel})
                </span>
                <span className="font-semibold">{formatPrice(item.unitPrice * item.quantity)}</span>
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
              <dt className="text-[var(--muted)]">Promo ({promoCode})</dt>
              <dd className="font-semibold text-[var(--leaf-deep)]">- {formatPrice(summary.promoDiscount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">GST</dt>
            <dd className="font-semibold">{formatPrice(summary.tax)}</dd>
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
