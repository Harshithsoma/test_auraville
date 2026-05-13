import { z } from "zod";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const otpSchema = z.string().trim().regex(/^\d{6}$/);
const signupPasswordSchema = z
  .string()
  .min(5, "Password must be at least 5 characters");

export const sendOtpSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    email: emailSchema
  })
});

export const verifyOtpSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    email: emailSchema,
    otp: otpSchema,
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/).optional()
  })
});

export const signupOtpSendSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z
    .object({
      name: z.string().trim().min(1).max(120),
      email: emailSchema,
      phone: z.string().trim().min(6).max(30),
      password: signupPasswordSchema,
      confirmPassword: z.string().min(1)
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"]
    })
});

export const signupOtpVerifySchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z
    .object({
      phone: z.string().trim().min(6).max(30).optional(),
      email: emailSchema.optional(),
      otp: otpSchema
    })
    .refine((value) => Boolean(value.phone || value.email), {
      message: "Either phone or email is required",
      path: ["phone"]
    })
});

export const loginOtpSendSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    identifier: z.string().trim().min(3).max(255)
  })
});

export const loginOtpVerifySchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    identifier: z.string().trim().min(3).max(255),
    otp: otpSchema
  })
});

export const loginPasswordSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    identifier: z.string().trim().min(3).max(255),
    password: z.string().min(1)
  })
});

export const forgotPasswordSendSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    identifier: z.string().trim().min(3).max(255)
  })
});

export const forgotPasswordResetSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z
    .object({
      identifier: z.string().trim().min(3).max(255),
      otp: otpSchema,
      newPassword: signupPasswordSchema,
      confirmPassword: z.string().min(1)
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"]
    })
});

export const refreshSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export const logoutSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export const meSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export type SendOtpValidatedInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpValidatedInput = z.infer<typeof verifyOtpSchema>;
export type SignupOtpSendValidatedInput = z.infer<typeof signupOtpSendSchema>;
export type SignupOtpVerifyValidatedInput = z.infer<typeof signupOtpVerifySchema>;
export type LoginOtpSendValidatedInput = z.infer<typeof loginOtpSendSchema>;
export type LoginOtpVerifyValidatedInput = z.infer<typeof loginOtpVerifySchema>;
export type LoginPasswordValidatedInput = z.infer<typeof loginPasswordSchema>;
export type ForgotPasswordSendValidatedInput = z.infer<typeof forgotPasswordSendSchema>;
export type ForgotPasswordResetValidatedInput = z.infer<typeof forgotPasswordResetSchema>;
export type RefreshValidatedInput = z.infer<typeof refreshSchema>;
export type LogoutValidatedInput = z.infer<typeof logoutSchema>;
