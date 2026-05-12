import type { RequestHandler } from "express";
import { timingSafeEqual } from "crypto";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

function readCsrfHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0]?.trim();
  return value.trim();
}

function safeEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export const requireCsrfToken: RequestHandler = (req, _res, next) => {
  const cookieToken = req.cookies?.[env.CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = readCsrfHeader(req.headers["x-csrf-token"] as string | string[] | undefined);

  if (!cookieToken || !headerToken) {
    next(new HttpError(403, "Forbidden", undefined, "CSRF_INVALID"));
    return;
  }

  if (!safeEquals(cookieToken, headerToken)) {
    next(new HttpError(403, "Forbidden", undefined, "CSRF_INVALID"));
    return;
  }

  next();
};
