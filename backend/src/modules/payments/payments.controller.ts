import type { RequestHandler } from "express";
import { processRazorpayWebhook, verifyPayment } from "./payments.service";
import type { PaymentVerifyValidatedInput } from "./payments.validation";

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
}

export const verifyPaymentController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as PaymentVerifyValidatedInput;
    const result = await verifyPayment(body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const razorpayWebhookController: RequestHandler = async (req, res, next) => {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : "", "utf8");

    const signatureHeader = readHeaderValue(req.headers["x-razorpay-signature"]);
    const eventIdHeader = readHeaderValue(req.headers["x-razorpay-event-id"]);

    const result = await processRazorpayWebhook({
      rawBody,
      signatureHeader,
      eventIdHeader
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
