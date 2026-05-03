import type { RequestHandler } from "express";
import { env } from "../../config/env";
import { clearRefreshCookie, setRefreshCookie } from "../../utils/cookies";
import { HttpError } from "../../utils/http-error";
import {
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

    res.status(200).json({
      data: result.data
    });
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

    res.status(200).json({ data: result.data });
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
};

export const logoutController: RequestHandler = async (req, res, next) => {
  try {
    const _validated = req as unknown as LogoutValidatedInput;

    const refreshToken = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;

    await logoutSession(refreshToken);
    clearRefreshCookie(res);

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
