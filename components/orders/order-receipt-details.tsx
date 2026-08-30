import { formatPrice } from "@/components/ui/price";

export type CustomerOrderPricing = {
  originalSubtotal: number;
  subtotal: number;
  baseSavings: number;
  couponCode: string | null;
  couponDiscount: number;
  promoDiscount?: number;
  gst: number;
  shipping: number;
  total: number;
};

export type CustomerShippingAddress = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  pincode: string;
  country: string;
};

export type CustomerOrderPayment = {
  provider: "Razorpay";
  status: "created" | "paid" | "failed" | "refunded";
} | null;

type OrderReceiptDetailsProps = {
  pricing: CustomerOrderPricing;
  payment: CustomerOrderPayment;
  shippingAddress: CustomerShippingAddress;
  orderStatus: string;
  className?: string;
};

export function formatDiscount(value: number): string {
  return value > 0 ? `-${formatPrice(value)}` : formatPrice(0);
}

export function paymentStatusLabel(payment: CustomerOrderPayment, orderStatus: string): string {
  if (payment?.status === "paid") return "Paid";
  if (payment?.status === "failed") return "Payment Failed";
  if (payment?.status === "refunded") return "Refunded";
  if (payment?.status === "created") return "Payment Pending";
  if (orderStatus === "payment_failed") return "Payment Failed";
  if (orderStatus === "pending") return "Payment Pending";
  if (orderStatus === "cancelled") return "Cancelled";
  return "Paid";
}

export function totalLabel(payment: CustomerOrderPayment, orderStatus: string): string {
  const successfulStatuses = new Set(["confirmed", "packed", "shipped", "out_for_delivery", "delivered"]);
  if (payment?.status === "paid" || (!payment && successfulStatuses.has(orderStatus))) {
    return "Total Paid";
  }
  return "Order Total";
}

export function getOrderSummaryValues(pricing: CustomerOrderPricing) {
  const itemsSubtotal = pricing.baseSavings > 0 ? pricing.originalSubtotal : pricing.subtotal;
  const couponDiscount = pricing.couponDiscount ?? pricing.promoDiscount ?? 0;
  const couponLabel = pricing.couponCode ? `Coupon (${pricing.couponCode})` : "Coupon discount";

  return { itemsSubtotal, couponDiscount, couponLabel };
}

export function OrderReceiptDetails({
  pricing,
  payment,
  shippingAddress,
  orderStatus,
  className = ""
}: OrderReceiptDetailsProps) {
  const { itemsSubtotal, couponDiscount, couponLabel } = getOrderSummaryValues(pricing);

  return (
    <section className={`mt-4 border-t border-[var(--line)] pt-4 ${className}`} aria-label="Order receipt details">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
          <h3 className="text-sm font-semibold">Order Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Items subtotal</dt>
              <dd className="font-medium">{formatPrice(itemsSubtotal)}</dd>
            </div>
            {pricing.baseSavings > 0 ? (
              <div className="flex items-center justify-between gap-4 text-[var(--leaf-deep)]">
                <dt>Product savings</dt>
                <dd className="font-medium">{formatDiscount(pricing.baseSavings)}</dd>
              </div>
            ) : null}
            {couponDiscount > 0 ? (
              <div className="flex items-center justify-between gap-4 text-[var(--leaf-deep)]">
                <dt>{couponLabel}</dt>
                <dd className="font-medium">{formatDiscount(couponDiscount)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Delivery</dt>
              <dd className="font-medium">{pricing.shipping > 0 ? formatPrice(pricing.shipping) : "FREE"}</dd>
            </div>
            {pricing.gst > 0 ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--muted)]">GST</dt>
                <dd className="font-medium">{formatPrice(pricing.gst)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3 text-base font-semibold">
              <dt>{totalLabel(payment, orderStatus)}</dt>
              <dd>{formatPrice(pricing.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-[var(--line)] bg-white p-4">
            <h3 className="text-sm font-semibold">Payment Details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Payment method</dt>
                <dd className="mt-0.5 font-medium">Online payment</dd>
              </div>
              {payment?.provider ? (
                <div>
                  <dt className="text-[var(--muted)]">Payment provider</dt>
                  <dd className="mt-0.5 font-medium">{payment.provider}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[var(--muted)]">Payment status</dt>
                <dd className="mt-0.5 font-medium">{paymentStatusLabel(payment, orderStatus)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white p-4">
            <h3 className="text-sm font-semibold">Delivering To</h3>
            <address className="mt-3 not-italic text-sm leading-6 text-[var(--muted)] break-words">
              <p className="font-semibold text-[var(--foreground)]">{shippingAddress.name}</p>
              <p>{shippingAddress.addressLine1}</p>
              {shippingAddress.addressLine2 ? <p>{shippingAddress.addressLine2}</p> : null}
              <p>
                {shippingAddress.city}{shippingAddress.state ? `, ${shippingAddress.state}` : ""} - {shippingAddress.pincode}
              </p>
              <p>{shippingAddress.country}</p>
              <p className="mt-1">Phone: {shippingAddress.phone}</p>
            </address>
          </div>
        </div>
      </div>
    </section>
  );
}
