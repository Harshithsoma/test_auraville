import type { Metadata } from "next";
import { OrderDetailsClient } from "@/components/orders/order-details-client";

export const metadata: Metadata = {
  title: "Order Details",
  description: "View your Auraville order details.",
  robots: {
    index: false,
    follow: true
  }
};

export default async function OrderDetailsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailsClient orderId={id} />;
}
