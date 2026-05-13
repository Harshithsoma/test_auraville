import { env } from "../config/env";

export class NotifyDeliveryError extends Error {
  public readonly code: "NOTIFY_PROVIDER_NOT_CONFIGURED" | "NOTIFY_SEND_FAILED";

  public constructor(code: "NOTIFY_PROVIDER_NOT_CONFIGURED" | "NOTIFY_SEND_FAILED", message: string) {
    super(message);
    this.code = code;
    this.name = "NotifyDeliveryError";
  }
}

type SendBackInStockEmailParams = {
  email: string;
  productName: string;
  productImage: string;
  productUrl: string;
};

function assertBrevoConfig(): void {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    throw new NotifyDeliveryError("NOTIFY_PROVIDER_NOT_CONFIGURED", "Back-in-stock email provider is not configured");
  }
}

function buildContent(params: SendBackInStockEmailParams): {
  subject: string;
  textContent: string;
  htmlContent: string;
} {
  const subject = "Your Auraville product is back in stock";
  const textContent = [
    `Good news! ${params.productName} is back in stock.`,
    "",
    `Buy now: ${params.productUrl}`,
    "",
    "Auraville"
  ].join("\n");

  const htmlContent = `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #1f2d26;">
    <h2 style="margin: 0 0 12px;">Back in stock at Auraville</h2>
    <p style="margin: 0 0 12px;"><strong>${params.productName}</strong> is available again.</p>
    <a href="${params.productUrl}" style="display: inline-block; background: #2f5d45; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 10px 16px; font-weight: 700;">
      Buy now
    </a>
    <div style="margin-top: 16px;">
      <img src="${params.productImage}" alt="${params.productName}" style="max-width: 220px; border-radius: 12px;" />
    </div>
    <p style="margin: 16px 0 0;">Auraville</p>
  </div>
  `.trim();

  return { subject, textContent, htmlContent };
}

export async function sendBackInStockEmail(params: SendBackInStockEmailParams): Promise<void> {
  if (env.OTP_DELIVERY_MODE === "dev_log") {
    return;
  }

  if (env.OTP_EMAIL_PROVIDER !== "brevo") {
    throw new NotifyDeliveryError("NOTIFY_PROVIDER_NOT_CONFIGURED", "Back-in-stock email provider is not configured");
  }

  assertBrevoConfig();

  const content = buildContent(params);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), env.EXTERNAL_API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_SENDER_EMAIL,
          name: env.BREVO_SENDER_NAME || "Auraville"
        },
        to: [
          {
            email: params.email
          }
        ],
        subject: content.subject,
        textContent: content.textContent,
        htmlContent: content.htmlContent
      }),
      signal: abortController.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new NotifyDeliveryError("NOTIFY_SEND_FAILED", "Back-in-stock email delivery timed out");
    }

    throw new NotifyDeliveryError("NOTIFY_SEND_FAILED", "Back-in-stock email delivery failed");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    await response.text();
    throw new NotifyDeliveryError("NOTIFY_SEND_FAILED", "Back-in-stock email delivery failed");
  }
}
