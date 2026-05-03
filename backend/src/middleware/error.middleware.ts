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
    res.status(error.statusCode).json({
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  const genericMessage = env.NODE_ENV === "production" ? "Internal server error" : error.message;

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: genericMessage
    }
  });
};
