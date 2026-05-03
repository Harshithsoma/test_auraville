export type PaymentVerifyRequest = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type PaymentVerifyResponse = {
  data: {
    orderId: string;
    status: "confirmed";
    paymentStatus: "paid";
  };
};

export type PaymentVerifyDuplicateResponse = {
  error: {
    code: "PAYMENT_ALREADY_CONFIRMED";
    message: string;
  };
};

export type RazorpayWebhookResponse = {
  data: {
    received: true;
    event: string;
    idempotent: boolean;
  };
};
