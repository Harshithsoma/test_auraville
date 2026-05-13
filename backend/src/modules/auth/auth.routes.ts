import { Router } from "express";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireCsrfToken } from "../../middleware/csrf.middleware";
import {
  authRateLimiter,
  loginOtpSendRateLimiter,
  loginOtpVerifyRateLimiter,
  logoutRateLimiter,
  otpSendRateLimiter,
  otpVerifyRateLimiter,
  passwordLoginRateLimiter,
  refreshRateLimiter,
  signupOtpSendRateLimiter,
  signupOtpVerifyRateLimiter
} from "../../middleware/rate-limit.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  forgotPasswordResetController,
  forgotPasswordSendController,
  loginOtpSendController,
  loginOtpVerifyController,
  loginPasswordController,
  logoutController,
  meController,
  refreshController,
  sendOtpController,
  signupOtpSendController,
  signupOtpVerifyController,
  verifyOtpController
} from "./auth.controller";
import {
  forgotPasswordResetSchema,
  forgotPasswordSendSchema,
  loginOtpSendSchema,
  loginOtpVerifySchema,
  loginPasswordSchema,
  logoutSchema,
  meSchema,
  refreshSchema,
  sendOtpSchema,
  signupOtpSendSchema,
  signupOtpVerifySchema,
  verifyOtpSchema
} from "./auth.validation";

export const authRouter = Router();
authRouter.use("/auth", authRateLimiter);

if (env.NODE_ENV !== "production") {
  authRouter.post("/auth/otp/send", otpSendRateLimiter, validateRequest(sendOtpSchema), sendOtpController);
  authRouter.post(
    "/auth/otp/verify",
    otpVerifyRateLimiter,
    validateRequest(verifyOtpSchema),
    verifyOtpController
  );
}

authRouter.post(
  "/auth/signup/otp/send",
  signupOtpSendRateLimiter,
  validateRequest(signupOtpSendSchema),
  signupOtpSendController
);
authRouter.post(
  "/auth/signup/otp/verify",
  signupOtpVerifyRateLimiter,
  validateRequest(signupOtpVerifySchema),
  signupOtpVerifyController
);
authRouter.post(
  "/auth/login/otp/send",
  loginOtpSendRateLimiter,
  validateRequest(loginOtpSendSchema),
  loginOtpSendController
);
authRouter.post(
  "/auth/login/otp/verify",
  loginOtpVerifyRateLimiter,
  validateRequest(loginOtpVerifySchema),
  loginOtpVerifyController
);
authRouter.post(
  "/auth/login/password",
  passwordLoginRateLimiter,
  validateRequest(loginPasswordSchema),
  loginPasswordController
);
authRouter.post(
  "/auth/password/forgot/send",
  loginOtpSendRateLimiter,
  validateRequest(forgotPasswordSendSchema),
  forgotPasswordSendController
);
authRouter.post(
  "/auth/password/forgot/reset",
  signupOtpVerifyRateLimiter,
  validateRequest(forgotPasswordResetSchema),
  forgotPasswordResetController
);

authRouter.post(
  "/auth/refresh",
  refreshRateLimiter,
  requireCsrfToken,
  validateRequest(refreshSchema),
  refreshController
);
authRouter.post(
  "/auth/logout",
  logoutRateLimiter,
  requireCsrfToken,
  validateRequest(logoutSchema),
  logoutController
);
authRouter.get("/auth/me", validateRequest(meSchema), requireAuth, meController);
