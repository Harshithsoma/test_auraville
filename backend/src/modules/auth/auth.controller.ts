import type { RequestHandler } from "express";
import { env } from "../../config/env";
import {
  clearCsrfCookie,
  clearRefreshCookie,
  generateCsrfToken,
  setCsrfCookie,
  setRefreshCookie
} from "../../utils/cookies";
import { HttpError } from "../../utils/http-error";
import {
  forgotPasswordOtpSend,
  forgotPasswordReset,
  getMe,
  loginOtpSend,
  loginOtpVerify,
  loginWithPassword,
  logoutSession,
  refreshSession,
  sendOtp,
  signupOtpSend,
  signupOtpVerify,
  verifyOtp
} from "./auth.service";
import type {
  ForgotPasswordResetValidatedInput,
  ForgotPasswordSendValidatedInput,
  LoginOtpSendValidatedInput,
  LoginOtpVerifyValidatedInput,
  LoginPasswordValidatedInput,
  LogoutValidatedInput,
  RefreshValidatedInput,
  SendOtpValidatedInput,
  SignupOtpSendValidatedInput,
  SignupOtpVerifyValidatedInput,
  VerifyOtpValidatedInput
} from "./auth.validation";

function setCsrfForSessionResponse(params: {
  response: Parameters<typeof setCsrfCookie>[0];
  expiresAt: Date;
}): void {
  const csrfToken = generateCsrfToken();
  setCsrfCookie(params.response, csrfToken, params.expiresAt);
  params.response.setHeader("X-CSRF-Token", csrfToken);
}

export const sendOtpController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as SendOtpValidatedInput;
    await sendOtp(body.email);

    res.status(200).json({
      data: {
        ok: true,
        message: "If the email is valid, an OTP has been sent"
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtpController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as VerifyOtpValidatedInput;
    const result = await verifyOtp(body);

    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    setCsrfForSessionResponse({ response: res, expiresAt: result.refreshExpiresAt });

    res.status(200).json({
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

export const signupOtpSendController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as SignupOtpSendValidatedInput;
    const result = await signupOtpSend(body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const signupOtpVerifyController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as SignupOtpVerifyValidatedInput;
    const result = await signupOtpVerify(body);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    setCsrfForSessionResponse({ response: res, expiresAt: result.refreshExpiresAt });

    res.status(200).json({
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

export const loginOtpSendController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as LoginOtpSendValidatedInput;
    const result = await loginOtpSend(body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const loginOtpVerifyController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as LoginOtpVerifyValidatedInput;
    const result = await loginOtpVerify(body);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    setCsrfForSessionResponse({ response: res, expiresAt: result.refreshExpiresAt });

    res.status(200).json({
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

export const loginPasswordController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as LoginPasswordValidatedInput;
    const result = await loginWithPassword(body);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    setCsrfForSessionResponse({ response: res, expiresAt: result.refreshExpiresAt });

    res.status(200).json({
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordSendController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as ForgotPasswordSendValidatedInput;
    const result = await forgotPasswordOtpSend(body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordResetController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as ForgotPasswordResetValidatedInput;
    const result = await forgotPasswordReset(body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const refreshController: RequestHandler = async (req, res, next) => {
  try {
    const _validated = req as unknown as RefreshValidatedInput;

    const refreshToken = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;

    if (!refreshToken) {
      throw new HttpError(401, "Unauthorized");
    }

    const result = await refreshSession(refreshToken);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    setCsrfForSessionResponse({ response: res, expiresAt: result.refreshExpiresAt });

    res.status(200).json({ data: result.data });
  } catch (error) {
    clearRefreshCookie(res);
    clearCsrfCookie(res);
    next(error);
  }
};

export const logoutController: RequestHandler = async (req, res, next) => {
  try {
    const _validated = req as unknown as LogoutValidatedInput;

    const refreshToken = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;

    await logoutSession(refreshToken);
    clearRefreshCookie(res);
    clearCsrfCookie(res);

    res.status(200).json({
      data: {
        ok: true
      }
    });
  } catch (error) {
    next(error);
  }
};

export const meController: RequestHandler = (req, res, next) => {
  try {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    res.status(200).json(getMe(req.authUser));
  } catch (error) {
    next(error);
  }
};
