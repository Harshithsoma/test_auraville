import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten()
      }
    });
    return;
  }

  if (error instanceof HttpError) {
    const shouldExposeDetails = env.NODE_ENV !== "production" || error.statusCode < 500;

    if (env.NODE_ENV !== "test" && error.statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error("Unhandled HttpError", {
        code: error.errorCode,
        statusCode: error.statusCode
      });
    }

    res.status(error.statusCode).json({
      error: {
        code: error.errorCode,
        message:
          env.NODE_ENV === "production" && error.statusCode >= 500
            ? "Internal server error"
            : error.message,
        ...(shouldExposeDetails ? { details: error.details } : {})
      }
    });
    return;
  }

  if (env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.error("Unhandled error", { name: error?.name });
  }

  const genericMessage = env.NODE_ENV === "production" ? "Internal server error" : error.message;

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: genericMessage
    }
  });
};
