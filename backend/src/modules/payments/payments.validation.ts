import { z } from "zod";

export const paymentVerifySchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    orderId: z.string().trim().min(1),
    razorpayOrderId: z.string().trim().min(1),
    razorpayPaymentId: z.string().trim().min(1),
    razorpaySignature: z.string().trim().min(1)
  })
});

export type PaymentVerifyValidatedInput = z.infer<typeof paymentVerifySchema>;
