import type { Response } from "express";
import { env } from "../config/env";

function getCookieBaseOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
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
