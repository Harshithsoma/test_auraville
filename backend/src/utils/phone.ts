import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { env } from "../config/env";

export class PhoneNormalizationError extends Error {
  public constructor(message = "Invalid phone number") {
    super(message);
    this.name = "PhoneNormalizationError";
  }
}

function toCountryCode(input: string): CountryCode {
  const normalized = input.trim().toUpperCase();
  return normalized as CountryCode;
}

export function normalizePhone(input: string, defaultCountry = env.OTP_DEFAULT_COUNTRY): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new PhoneNormalizationError("Phone number is required");
  }

  const parsed = trimmed.startsWith("+")
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, toCountryCode(defaultCountry));

  if (!parsed || !parsed.isValid()) {
    throw new PhoneNormalizationError("Invalid phone number");
  }

  return parsed.number;
}
