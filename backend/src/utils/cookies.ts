import type { Response } from "express";
import { randomBytes } from "crypto";
import { env } from "../config/env";

function getCookieBaseOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    partitioned: env.NODE_ENV === "production",
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {})
  };
}

export function setRefreshCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(env.REFRESH_COOKIE_NAME, token, getCookieBaseOptions(expiresAt));
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(env.REFRESH_COOKIE_NAME, getCookieBaseOptions());
}

function getCsrfCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    partitioned: env.NODE_ENV === "production",
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {})
  };
}

export function generateCsrfToken(): string {
  return randomBytes(24).toString("hex");
}

export function setCsrfCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(env.CSRF_COOKIE_NAME, token, getCsrfCookieOptions(expiresAt));
}

export function clearCsrfCookie(response: Response): void {
  response.clearCookie(env.CSRF_COOKIE_NAME, getCsrfCookieOptions());
}
