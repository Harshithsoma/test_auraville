"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useCartPricing } from "@/hooks/use-cart-pricing";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";
import type { UserAddress, UserAddressesResponse } from "@/types/address";

type CheckoutErrors = Partial<
  Record<
    "name" | "email" | "phone" | "addressLine1" | "city" | "state" | "country" | "pincode",
    string
  >
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
  theme?: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (payload: {
      error?: {
        code?: string;
        description?: string;
        source?: string;
        step?: string;
        reason?: string;
        metadata?: {
          order_id?: string;
          payment_id?: string;
        };
      };
    }) => void
  ) => void;
};

type AddressMutationResponse = {
  data: UserAddress;
};

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
};

type AddressFormState = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const RAZORPAY_MODAL_WATCHDOG_MS = 120_000;

function hasRazorpayOverlay(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return Boolean(
    document.querySelector(".razorpay-container, .razorpay-backdrop, .razorpay-checkout-frame")
  );
}

function restoreCheckoutInteractivity(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.body.style.pointerEvents = "";
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
  document.body.style.paddingRight = "";
  document.documentElement.style.overflow = "";
  document.documentElement.style.touchAction = "";
}

function clearRazorpayArtifacts(): void {
  if (typeof document === "undefined") {
    return;
  }

  const staleNodes = document.querySelectorAll<HTMLElement>(
    ".razorpay-container, .razorpay-backdrop, .razorpay-checkout-frame"
  );
  staleNodes.forEach((node) => node.remove());
  restoreCheckoutInteractivity();
}

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
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_URL}"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve(Boolean(window.Razorpay));
        return;
      }

      const existingTimeout = window.setTimeout(() => resolve(Boolean(window.Razorpay)), 5000);
      existingScript.addEventListener(
        "load",
        () => {
          window.clearTimeout(existingTimeout);
          existingScript.dataset.loaded = "true";
          resolve(true);
        },
        { once: true }
      );
      existingScript.addEventListener(
        "error",
        () => {
          window.clearTimeout(existingTimeout);
          resolve(false);
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  }).finally(() => {
    razorpayScriptPromise = null;
  });

  return razorpayScriptPromise;
}

function validateContact(contact: ContactFormState): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (contact.name.trim().length < 2) errors.name = "Enter full name";
  if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) errors.email = "Enter a valid email";
  if (!/^[6-9]\d{9}$/.test(contact.phone.trim())) errors.phone = "Enter a valid 10-digit Indian mobile number";

  return errors;
}

function validateAddress(address: AddressFormState): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (address.addressLine1.trim().length < 3) errors.addressLine1 = "Address is required";
  if (address.city.trim().length < 2) errors.city = "City is required";
  if (address.state.trim().length < 2) errors.state = "State is required";
  if (!/^\d{6}$/.test(address.pincode.trim())) errors.pincode = "Enter a valid 6-digit pincode";
  if (address.country.trim().length < 2) errors.country = "Country is required";

  return errors;
}

function parseRazorpayFailureMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Payment failed. Your cart is safe. Please try again.";
  }

  const errorPayload = (payload as { error?: unknown }).error;
  if (!errorPayload || typeof errorPayload !== "object") {
    return "Payment failed. Your cart is safe. Please try again.";
  }

  const descriptionRaw = (errorPayload as { description?: unknown }).description;
  const description = typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0
    ? descriptionRaw.trim()
    : null;
  if (description) {
    return description;
  }

  const reasonRaw = (errorPayload as { reason?: unknown }).reason;
  const reason = typeof reasonRaw === "string" && reasonRaw.trim().length > 0
    ? reasonRaw.trim()
    : null;
  if (reason) {
    return `Payment failed: ${reason}.`;
  }

  return "Payment failed. Your cart is safe. Please try again.";
}

function toAddressForm(address: UserAddress): AddressFormState {
  return {
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country || "India",
    landmark: address.landmark ?? ""
  };
}

function areAddressesEquivalent(address: AddressFormState, saved: UserAddress): boolean {
  return (
    address.addressLine1.trim() === saved.addressLine1.trim() &&
    address.addressLine2.trim() === (saved.addressLine2 ?? "").trim() &&
    address.city.trim() === saved.city.trim() &&
    address.state.trim() === saved.state.trim() &&
    address.pincode.trim() === saved.pincode.trim() &&
    address.country.trim() === saved.country.trim() &&
    address.landmark.trim() === (saved.landmark ?? "").trim()
  );
}

export default function CheckoutClient() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const promoCode = useCartStore((state) => state.promoCode);
  const user = useAuthStore((state) => state.user);
  const { summary, enrichedItems, pricingError, isBackendPricing, isPricingLoading } = useCartPricing();

  const [contact, setContact] = useState<ContactFormState>({
    name: "",
    email: "",
    phone: ""
  });
  const [shippingAddress, setShippingAddress] = useState<AddressFormState>({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    landmark: ""
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [saveAddressForLater, setSaveAddressForLater] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const paymentSessionRef = useRef(0);
  const paymentModalOpenRef = useRef(false);
  const modalWatchdogRef = useRef<number | null>(null);
  const focusRecoveryTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const hasUnavailableItems = useMemo(
    () => enrichedItems.some((item) => !item.available || item.stock <= 0 || item.quantity > item.stock),
    [enrichedItems]
  );

  const canSubmit = useMemo(() => {
    return items.length > 0 && !isSubmitting && !isPaymentModalOpen && !hasUnavailableItems;
  }, [hasUnavailableItems, isSubmitting, isPaymentModalOpen, items.length]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (modalWatchdogRef.current) {
        window.clearTimeout(modalWatchdogRef.current);
      }
      if (focusRecoveryTimeoutRef.current) {
        window.clearTimeout(focusRecoveryTimeoutRef.current);
      }
      window.removeEventListener("focus", handleWindowFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setContact({ name: "", email: "", phone: "" });
      return;
    }

    setContact({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? ""
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      setSelectedAddressId(null);
      setUseNewAddress(true);
      return;
    }

    let cancelled = false;

    async function loadSavedAddresses() {
      setIsLoadingAddresses(true);
      try {
        const response = await commerceApi.account.addresses.list<UserAddressesResponse>();
        if (cancelled) return;
        setSavedAddresses(response.data);
        const defaultAddress = response.data.find((address) => address.isDefault) ?? response.data[0];
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setShippingAddress(toAddressForm(defaultAddress));
          setUseNewAddress(false);
        } else {
          setSelectedAddressId(null);
          setUseNewAddress(true);
        }
      } catch {
        if (cancelled) return;
        setSavedAddresses([]);
        setSelectedAddressId(null);
        setUseNewAddress(true);
      } finally {
        if (!cancelled) {
          setIsLoadingAddresses(false);
        }
      }
    }

    void loadSavedAddresses();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function clearWatchdog() {
    if (modalWatchdogRef.current) {
      window.clearTimeout(modalWatchdogRef.current);
      modalWatchdogRef.current = null;
    }
  }

  function clearFocusRecovery() {
    if (focusRecoveryTimeoutRef.current) {
      window.clearTimeout(focusRecoveryTimeoutRef.current);
      focusRecoveryTimeoutRef.current = null;
    }
    window.removeEventListener("focus", handleWindowFocus);
  }

  function handleWindowFocus() {
    clearFocusRecovery();
    focusRecoveryTimeoutRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      if (!paymentModalOpenRef.current) return;
      if (hasRazorpayOverlay()) return;
      resetPaymentState("Payment cancelled. You can try again.");
    }, 250);
  }

  function armFocusRecovery() {
    clearFocusRecovery();
    window.addEventListener("focus", handleWindowFocus);
  }

  function resetPaymentState(message?: string, options?: { keepSubmitting?: boolean }) {
    clearWatchdog();
    clearFocusRecovery();
    if (!mountedRef.current) {
      return;
    }
    paymentModalOpenRef.current = false;
    setIsPaymentModalOpen(false);
    setIsSubmitting(Boolean(options?.keepSubmitting));
    if (!options?.keepSubmitting) {
      clearRazorpayArtifacts();
    }
    if (message) {
      setCheckoutError(message);
    }
  }

  function onSelectSavedAddress(address: UserAddress) {
    setSelectedAddressId(address.id);
    setShippingAddress(toAddressForm(address));
    setUseNewAddress(false);
    setSaveAddressForLater(false);
    setErrors((current) => ({
      ...current,
      addressLine1: undefined,
      city: undefined,
      state: undefined,
      pincode: undefined,
      country: undefined
    }));
  }

  async function maybeSaveAddressForLoggedInUser() {
    if (!user || !useNewAddress || !saveAddressForLater) {
      return;
    }

    const alreadyExists = savedAddresses.some((saved) => areAddressesEquivalent(shippingAddress, saved));
    if (alreadyExists) {
      return;
    }

    try {
      await commerceApi.account.addresses.create<
        AddressMutationResponse,
        {
          fullName: string;
          phone: string;
          addressLine1: string;
          addressLine2?: string;
          city: string;
          state: string;
          pincode: string;
          country: string;
          landmark?: string;
          isDefault: boolean;
        }
      >({
        fullName: contact.name.trim(),
        phone: contact.phone.trim(),
        addressLine1: shippingAddress.addressLine1.trim(),
        addressLine2: shippingAddress.addressLine2.trim() || undefined,
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        pincode: shippingAddress.pincode.trim(),
        country: shippingAddress.country.trim(),
        landmark: shippingAddress.landmark.trim() || undefined,
        isDefault: savedAddresses.length === 0
      });
    } catch {
      // Address-book save should never block order placement.
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setCheckoutError(null);
    const contactErrors = validateContact(contact);
    const addressErrors = validateAddress(shippingAddress);
    const nextErrors = { ...contactErrors, ...addressErrors };
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!isBackendPricing) {
      setCheckoutError("Live cart pricing is required before payment. Please retry in a moment.");
      return;
    }

    if (hasUnavailableItems) {
      setCheckoutError("Some items are unavailable or exceed stock. Please update your cart before checkout.");
      return;
    }

    const currentSession = paymentSessionRef.current + 1;
    paymentSessionRef.current = currentSession;
    paymentModalOpenRef.current = false;
    setIsSubmitting(true);
    setIsPaymentModalOpen(false);

    try {
      await maybeSaveAddressForLoggedInUser();

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
          name: contact.name.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim()
        },
        shippingAddress: {
          addressLine1: shippingAddress.addressLine1.trim(),
          addressLine2: shippingAddress.addressLine2.trim() || undefined,
          city: shippingAddress.city.trim(),
          state: shippingAddress.state.trim(),
          pincode: shippingAddress.pincode.trim(),
          country: shippingAddress.country.trim()
        }
      });
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        resetPaymentState("Payment window could not be opened. Please try again.");
        return;
      }

      const { order, razorpay } = orderResponse.data;
      if (
        !razorpay.keyId ||
        (!razorpay.keyId.startsWith("rzp_test_") && !razorpay.keyId.startsWith("rzp_live_")) ||
        !razorpay.orderId ||
        !razorpay.orderId.startsWith("order_") ||
        !Number.isInteger(razorpay.amount) ||
        razorpay.amount <= 0 ||
        razorpay.currency !== "INR"
      ) {
        resetPaymentState("Payment initialization failed due to invalid gateway details. Please try again.");
        return;
      }

      const options: RazorpayCheckoutOptions = {
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: "INR",
        name: "Auraville",
        description: "Auraville Order",
        order_id: razorpay.orderId,
        modal: {
          ondismiss: () => {
            try {
              if (paymentSessionRef.current !== currentSession) return;
              resetPaymentState("Payment cancelled. You can try again.");
            } catch {
              resetPaymentState("Payment cancelled. You can try again.");
            }
          }
        },
        handler: async (response) => {
          if (paymentSessionRef.current !== currentSession) return;
          try {
            resetPaymentState(undefined, { keepSubmitting: true });
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
            resetPaymentState();
            router.push(`/order-success?order=${encodeURIComponent(order.id)}`);
          } catch (verifyError) {
            if (verifyError instanceof ApiError) {
              resetPaymentState(verifyError.message);
            } else {
              resetPaymentState("Payment verification failed. Your cart is still saved.");
            }
          }
        }
      };

      const debugObject = {
        orderTotalRupees: orderResponse.data.pricing.total,
        backendRazorpayAmountPaise: razorpay.amount,
        frontendOptionsAmount: options.amount,
        frontendOptionsCurrency: options.currency,
        frontendOptionsOrderId: options.order_id,
        backendRazorpayOrderId: razorpay.orderId,
        amountMatches: options.amount === razorpay.amount,
        orderIdMatches: options.order_id === razorpay.orderId,
        amountIsInteger: Number.isInteger(options.amount),
        amountLooksLikePaise: options.amount > 1000
      };

      if (
        !debugObject.amountMatches ||
        !debugObject.orderIdMatches ||
        !debugObject.amountIsInteger ||
        debugObject.frontendOptionsCurrency !== "INR"
      ) {
        resetPaymentState("Payment mismatch detected. Please refresh.");
        return;
      }

      let razorpayInstance: RazorpayInstance;
      try {
        razorpayInstance = new window.Razorpay(options);
      } catch {
        resetPaymentState("Payment window could not be opened. Please try again.");
        return;
      }
      razorpayInstance.on("payment.failed", (payload) => {
        try {
          if (paymentSessionRef.current !== currentSession) return;
          const failureMessage = parseRazorpayFailureMessage(payload);
          resetPaymentState(failureMessage || "Payment failed. Your cart is safe. Please try again.");
        } catch {
          resetPaymentState("Payment failed. Your cart is safe. Please try again.");
        }
      });

      setIsSubmitting(false);
      paymentModalOpenRef.current = true;
      setIsPaymentModalOpen(true);
      clearWatchdog();
      modalWatchdogRef.current = window.setTimeout(() => {
        if (paymentSessionRef.current !== currentSession) return;
        resetPaymentState("Payment window could not be opened. Please try again.");
      }, RAZORPAY_MODAL_WATCHDOG_MS);
      armFocusRecovery();
      try {
        razorpayInstance.open();
      } catch {
        resetPaymentState("Payment window could not be opened. Please try again.");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        resetPaymentState(error.message);
      } else {
        resetPaymentState("Unable to create order right now. Please try again.");
      }
    }
  }

  if (!hasMounted) {
    return <div className="rounded-lg border border-[var(--line)] bg-white p-8">Preparing checkout...</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <form className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-8" noValidate onSubmit={handleSubmit}>
        <h2 className="text-2xl font-semibold">Secure checkout</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          1. Contact · 2. Delivery Address · 3. Order Summary · 4. Payment
        </p>

        <div className="mt-6 rounded-lg border border-[var(--line)] p-4">
          <h3 className="text-lg font-semibold">1. Contact</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Full name</span>
              <Input
                className="mt-2"
                value={contact.name}
                onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))}
                aria-invalid={Boolean(errors.name)}
                autoComplete="name"
              />
              {errors.name ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.name}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Email</span>
              <Input
                className="mt-2"
                type="email"
                value={contact.email}
                onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
              />
              {errors.email ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.email}</span> : null}
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Mobile number</span>
              <Input
                className="mt-2"
                value={contact.phone}
                onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))}
                aria-invalid={Boolean(errors.phone)}
                inputMode="numeric"
                autoComplete="tel"
              />
              {errors.phone ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.phone}</span> : null}
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[var(--line)] p-4">
          <h3 className="text-lg font-semibold">2. Delivery Address</h3>

          {user ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={!useNewAddress ? "primary" : "secondary"}
                  className="min-h-9 px-3 py-2 text-xs"
                  onClick={() => setUseNewAddress(false)}
                >
                  Use saved address
                </Button>
                <Button
                  type="button"
                  variant={useNewAddress ? "primary" : "secondary"}
                  className="min-h-9 px-3 py-2 text-xs"
                  onClick={() => {
                    setUseNewAddress(true);
                    setSelectedAddressId(null);
                  }}
                >
                  Add new address
                </Button>
                <Button
                  type="button"
                  variant="utility"
                  className="min-h-9 px-3 py-2 text-xs"
                  href="/account/addresses"
                >
                  Manage saved addresses
                </Button>
              </div>

              {!useNewAddress ? (
                isLoadingAddresses ? (
                  <p className="text-sm text-[var(--muted)]">Loading saved addresses...</p>
                ) : savedAddresses.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    No saved addresses yet. Switch to “Add new address”.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedAddresses.map((address) => (
                      <label
                        className="block rounded-lg border border-[var(--line)] bg-[var(--background)] p-3"
                        key={address.id}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="saved-address"
                            checked={selectedAddressId === address.id}
                            onChange={() => onSelectSavedAddress(address)}
                          />
                          <div>
                            <p className="font-semibold">
                              {address.fullName}{" "}
                              {address.isDefault ? (
                                <span className="rounded bg-[var(--mint)] px-2 py-0.5 text-xs text-[var(--leaf-deep)]">
                                  Default
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {address.addressLine1}
                              {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                              {address.landmark ? `, ${address.landmark}` : ""}
                              <br />
                              {address.city}, {address.state} {address.pincode}, {address.country}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">Guest checkout is enabled. Add delivery details below.</p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Address line 1</span>
              <Textarea
                className="mt-2 min-h-20"
                value={shippingAddress.addressLine1}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, addressLine1: event.target.value }))
                }
                aria-invalid={Boolean(errors.addressLine1)}
                autoComplete="street-address"
              />
              {errors.addressLine1 ? (
                <span className="mt-1 block text-xs text-[var(--coral)]">{errors.addressLine1}</span>
              ) : null}
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Address line 2 (optional)</span>
              <Input
                className="mt-2"
                value={shippingAddress.addressLine2}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, addressLine2: event.target.value }))
                }
                autoComplete="address-line2"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Landmark (optional)</span>
              <Input
                className="mt-2"
                value={shippingAddress.landmark}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, landmark: event.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">City</span>
              <Input
                className="mt-2"
                value={shippingAddress.city}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, city: event.target.value }))
                }
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.city}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-semibold">State</span>
              <Input
                className="mt-2"
                value={shippingAddress.state}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, state: event.target.value }))
                }
                aria-invalid={Boolean(errors.state)}
              />
              {errors.state ? <span className="mt-1 block text-xs text-[var(--coral)]">{errors.state}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Pincode</span>
              <Input
                className="mt-2"
                value={shippingAddress.pincode}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, pincode: event.target.value }))
                }
                aria-invalid={Boolean(errors.pincode)}
                inputMode="numeric"
              />
              {errors.pincode ? (
                <span className="mt-1 block text-xs text-[var(--coral)]">{errors.pincode}</span>
              ) : null}
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Country</span>
              <Input
                className="mt-2"
                value={shippingAddress.country}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, country: event.target.value }))
                }
                aria-invalid={Boolean(errors.country)}
              />
              {errors.country ? (
                <span className="mt-1 block text-xs text-[var(--coral)]">{errors.country}</span>
              ) : null}
            </label>
          </div>

          {user && useNewAddress ? (
            <label className="mt-4 inline-flex items-center gap-2 text-sm">
              <input
                checked={saveAddressForLater}
                type="checkbox"
                onChange={(event) => setSaveAddressForLater(event.target.checked)}
              />
              Save this address to my account
            </label>
          ) : null}
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-[var(--line)] bg-[var(--mint)] p-5">
          <h3 className="font-semibold">4. Payment</h3>
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
          {isSubmitting
            ? "Processing payment..."
            : isPaymentModalOpen
              ? "Payment window open..."
              : "Place secure order"}
        </Button>
      </form>

      <aside className="h-fit rounded-lg border border-[var(--line)] bg-white p-6 lg:sticky lg:top-28">
        <h2 className="text-xl font-semibold">3. Order Summary</h2>
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
                  {!item.available || item.stock <= 0 || item.quantity > item.stock ? (
                    <span className="ml-2 font-semibold text-[var(--coral)]">(Unavailable)</span>
                  ) : null}
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
