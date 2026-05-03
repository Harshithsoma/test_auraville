import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
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

authRouter.post("/auth/otp/send", otpSendRateLimiter, validateRequest(sendOtpSchema), sendOtpController);
authRouter.post(
  "/auth/otp/verify",
  otpVerifyRateLimiter,
  validateRequest(verifyOtpSchema),
  verifyOtpController
);

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

authRouter.post("/auth/refresh", refreshRateLimiter, validateRequest(refreshSchema), refreshController);
authRouter.post("/auth/logout", logoutRateLimiter, validateRequest(logoutSchema), logoutController);
authRouter.get("/auth/me", validateRequest(meSchema), requireAuth, meController);
