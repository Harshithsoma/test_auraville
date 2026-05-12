import type { CorsOptions } from "cors";
import { env } from "./env";

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
}

const configuredOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const allowedOrigins = new Set([env.FRONTEND_URL, ...configuredOrigins].map(normalizeOrigin));

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    // Block disallowed browser origins without throwing noisy 500s.
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposedHeaders: ["X-CSRF-Token"],
  optionsSuccessStatus: 204
};
