import { env } from "../config/env";

type OtpDeliveryBaseParams = {
  otp: string;
  purpose: "SIGNUP" | "LOGIN" | "PASSWORD_RESET";
};

type SendEmailOtpParams = OtpDeliveryBaseParams & {
  email: string;
};

type SendSmsOtpParams = OtpDeliveryBaseParams & {
  phoneE164: string;
};

export class OtpDeliveryError extends Error {
  public readonly code: "OTP_SEND_FAILED" | "OTP_PROVIDER_NOT_CONFIGURED" | "SMS_OTP_NOT_AVAILABLE";

  public constructor(
    code: "OTP_SEND_FAILED" | "OTP_PROVIDER_NOT_CONFIGURED" | "SMS_OTP_NOT_AVAILABLE",
    message: string
  ) {
    super(message);
    this.code = code;
    this.name = "OtpDeliveryError";
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }

  const visiblePrefix = localPart.slice(0, 2);
  const maskedRemainder = "*".repeat(Math.max(localPart.length - 2, 1));
  return `${visiblePrefix}${maskedRemainder}@${domain}`;
}

function maskPhone(phoneE164: string): string {
  if (phoneE164.length <= 4) {
    return "***";
  }

  const lastFour = phoneE164.slice(-4);
  return `***${lastFour}`;
}

function logDevOtp(params: { channel: "email" | "sms"; destination: string; purpose: string; otp: string }): void {
  if (env.NODE_ENV === "production") {
    return;
  }

  const maskedDestination =
    params.channel === "email" ? maskEmail(params.destination) : maskPhone(params.destination);

  // eslint-disable-next-line no-console
  console.log(`[OTP:${params.channel}] ${params.purpose} => ${maskedDestination} code=REDACTED`);
}

function getOtpExpiryMinutes(): number {
  return env.OTP_TTL_MINUTES;
}

function buildOtpEmailContent(params: { otp: string; purpose: string; expiryMinutes: number }) {
  const subject = "Your Auraville verification code";
  const textContent = [
    `Your Auraville verification code is: ${params.otp}`,
    "",
    `This code expires in ${params.expiryMinutes} minutes.`,
    "Do not share this code with anyone.",
    "",
    "Auraville"
  ].join("\n");

  const htmlContent = `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #1f2d26;">
    <h2 style="margin: 0 0 12px;">Auraville Verification</h2>
    <p style="margin: 0 0 8px;">Use the verification code below to continue your ${params.purpose.toLowerCase()} request:</p>
    <p style="font-size: 24px; letter-spacing: 3px; font-weight: 700; margin: 12px 0;">${params.otp}</p>
    <p style="margin: 0 0 8px;">This code expires in <strong>${params.expiryMinutes} minutes</strong>.</p>
    <p style="margin: 0 0 8px;">Do not share this code with anyone.</p>
    <p style="margin: 16px 0 0;">Auraville</p>
  </div>
  `.trim();

  return { subject, textContent, htmlContent };
}

function assertBrevoEmailConfig(): void {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    throw new OtpDeliveryError("OTP_PROVIDER_NOT_CONFIGURED", "Email OTP provider is not configured");
  }
}

function getEmailDomain(email: string): string {
  const [, domain] = email.split("@");
  return domain || "unknown";
}

async function sendEmailViaBrevo(params: SendEmailOtpParams): Promise<void> {
  assertBrevoEmailConfig();

  const brevoUrl = "https://api.brevo.com/v3/smtp/email";
  const recipientDomain = getEmailDomain(params.email);

  // eslint-disable-next-line no-console
  console.info("Brevo OTP send attempt started", {
    otpDeliveryMode: env.OTP_DELIVERY_MODE,
    otpEmailProvider: env.OTP_EMAIL_PROVIDER,
    hasBrevoApiKey: Boolean(env.BREVO_API_KEY),
    hasBrevoSenderEmail: Boolean(env.BREVO_SENDER_EMAIL),
    brevoSenderEmail: env.BREVO_SENDER_EMAIL || "",
    brevoSenderName: env.BREVO_SENDER_NAME || "Auraville",
    recipientEmailDomain: recipientDomain,
    brevoRequestUrl: brevoUrl
  });

  const content = buildOtpEmailContent({
    otp: params.otp,
    purpose: params.purpose,
    expiryMinutes: getOtpExpiryMinutes()
  });

  const response = await fetch(brevoUrl, {
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
    })
  });

  if (!response.ok) {
    const responseBody = await response.text();
    // eslint-disable-next-line no-console
    console.error("Brevo OTP send failed", {
      otpDeliveryMode: env.OTP_DELIVERY_MODE,
      otpEmailProvider: env.OTP_EMAIL_PROVIDER,
      recipientEmailDomain: recipientDomain,
      brevoRequestUrl: brevoUrl,
      brevoResponseStatus: response.status,
      brevoResponseBody: responseBody
    });
    throw new OtpDeliveryError("OTP_SEND_FAILED", "Email OTP delivery failed");
  }

  // eslint-disable-next-line no-console
  console.info("Brevo OTP send success", {
    otpDeliveryMode: env.OTP_DELIVERY_MODE,
    otpEmailProvider: env.OTP_EMAIL_PROVIDER,
    recipientEmailDomain: recipientDomain,
    brevoRequestUrl: brevoUrl,
    brevoResponseStatus: response.status
  });
}

export function isSmsOtpAvailable(): boolean {
  if (env.OTP_DELIVERY_MODE !== "provider") {
    return false;
  }

  return Boolean(
    env.OTP_SMS_PROVIDER &&
      env.OTP_SMS_API_KEY &&
      env.OTP_SMS_API_SECRET &&
      env.OTP_SMS_SENDER_ID
  );
}

export function isEmailOtpAvailable(): boolean {
  if (env.OTP_DELIVERY_MODE === "dev_log") {
    return true;
  }

  if (env.OTP_EMAIL_PROVIDER === "brevo") {
    return Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL);
  }

  return false;
}

export async function sendEmailOtp(params: SendEmailOtpParams): Promise<void> {
  if (env.OTP_DELIVERY_MODE === "dev_log") {
    logDevOtp({
      channel: "email",
      destination: params.email,
      purpose: params.purpose,
      otp: params.otp
    });
    return;
  }

  if (env.OTP_EMAIL_PROVIDER !== "brevo") {
    throw new OtpDeliveryError("OTP_PROVIDER_NOT_CONFIGURED", "Email OTP provider is not configured");
  }

  await sendEmailViaBrevo(params);
}

export async function sendSmsOtp(params: SendSmsOtpParams): Promise<void> {
  if (env.OTP_DELIVERY_MODE === "dev_log") {
    logDevOtp({
      channel: "sms",
      destination: params.phoneE164,
      purpose: params.purpose,
      otp: params.otp
    });
    return;
  }

  throw new OtpDeliveryError("SMS_OTP_NOT_AVAILABLE", "Mobile OTP is coming soon. Please use email OTP or password login.");
}
