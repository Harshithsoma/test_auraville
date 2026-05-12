import { env } from "../config/env";
import { normalizePhone } from "./phone";

export type ResolvedIdentifier =
  | {
      identifierType: "EMAIL";
      value: string;
    }
  | {
      identifierType: "PHONE";
      value: string;
    };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isEmailIdentifier(input: string): boolean {
  return EMAIL_REGEX.test(input.trim());
}

export function resolveIdentifier(input: string, defaultCountry = env.OTP_DEFAULT_COUNTRY): ResolvedIdentifier {
  const trimmed = input.trim();

  if (isEmailIdentifier(trimmed)) {
    return {
      identifierType: "EMAIL",
      value: normalizeEmail(trimmed)
    };
  }

  return {
    identifierType: "PHONE",
    value: normalizePhone(trimmed, defaultCountry)
  };
}
