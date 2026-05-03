import { env } from "./env";
import { HttpError } from "../utils/http-error";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

export async function createRazorpayOrder(params: {
  amountInPaise: number;
  currency: "INR";
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  const authToken = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString(
    "base64"
  );
  const normalizedBaseUrl = env.RAZORPAY_API_BASE_URL.replace(/\/+$/, "");
  const apiBaseWithVersion = /\/v1$/i.test(normalizedBaseUrl)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/v1`;
  const ordersUrl = `${apiBaseWithVersion}/orders`;

  const response = await fetch(ordersUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authToken}`
    },
    body: JSON.stringify({
      amount: params.amountInPaise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {}
    })
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    throw new HttpError(502, "Failed to create Razorpay order", details);
  }

  const payload = (await response.json()) as RazorpayOrderResponse;

  if (!payload.id || payload.currency !== "INR") {
    throw new HttpError(502, "Invalid Razorpay order response");
  }

  return payload;
}
