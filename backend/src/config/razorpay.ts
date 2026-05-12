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

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), env.EXTERNAL_API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ordersUrl, {
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
      }),
      signal: abortController.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError(504, "Razorpay request timed out");
    }
    throw new HttpError(502, "Failed to create Razorpay order");
  } finally {
    clearTimeout(timeout);
  }

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
