import type { RequestHandler } from "express";
import { timingSafeEqual } from "crypto";
import { env } from "../config/env";
import { getCookieCandidates } from "../utils/cookie-candidates";
import { HttpError } from "../utils/http-error";

function readCsrfHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0]?.trim();
  return value.trim();
}

function readCookieHeader(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.join("; ");
  return value;
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
  const headerToken = readCsrfHeader(req.headers["x-csrf-token"] as string | string[] | undefined);
  const cookieHeader = readCookieHeader(req.headers.cookie as string | string[] | undefined);
  const cookieCandidates = getCookieCandidates({
    cookieHeader,
    cookieName: env.CSRF_COOKIE_NAME,
    parsedCookieValue: req.cookies?.[env.CSRF_COOKIE_NAME] as string | undefined
  });

  if (cookieCandidates.length === 0 || !headerToken) {
    next(new HttpError(403, "Forbidden", undefined, "CSRF_INVALID"));
    return;
  }

  const hasMatch = cookieCandidates.some((cookieToken) => safeEquals(cookieToken, headerToken));
  if (!hasMatch) {
    next(new HttpError(403, "Forbidden", undefined, "CSRF_INVALID"));
    return;
  }

  next();
};
