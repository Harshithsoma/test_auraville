import { config } from "dotenv";
import { z } from "zod";

config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  TRUST_PROXY: z.string().default("1"),
  FRONTEND_URL: z.string().url(),
  CORS_ORIGINS: z.string().default(""),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_HASH_PEPPER: z.string().min(1),
  OTP_DEFAULT_COUNTRY: z.string().trim().length(2).default("IN"),
  OTP_DELIVERY_MODE: z.enum(["dev_log", "provider"]).default("dev_log"),
  PASSWORD_HASH_PEPPER: z.string().default(""),
  OTP_SMS_PROVIDER: z.string().default(""),
  OTP_SMS_API_KEY: z.string().default(""),
  OTP_SMS_API_SECRET: z.string().default(""),
  OTP_SMS_SENDER_ID: z.string().default(""),
  OTP_SMS_TEMPLATE_ID: z.string().default(""),
  OTP_EMAIL_PROVIDER: z.string().default(""),
  OTP_EMAIL_FROM: z.string().default(""),
  BREVO_API_KEY: z.string().default(""),
  BREVO_SENDER_EMAIL: z.string().default(""),
  BREVO_SENDER_NAME: z.string().default("Auraville"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.string().default(""),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_SECURE: z.string().default(""),
  REFRESH_COOKIE_NAME: z.string().min(1).default("auraville_refresh_token"),
  CSRF_COOKIE_NAME: z.string().min(1).default("auraville_csrf_token"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_API_BASE_URL: z.string().url().default("https://api.razorpay.com"),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  EXTERNAL_API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(10000),
  CLOUDINARY_UPLOAD_FOLDER: z.string().trim().min(1).default("auraville")
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment variables: ${formatted}`);
}

export const env = parsed.data;
