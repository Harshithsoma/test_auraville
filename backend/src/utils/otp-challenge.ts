import { randomInt } from "crypto";
import { env } from "../config/env";
import { safeEqual, sha256 } from "./hash";

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

type OtpHashParams = {
  identifier: string;
  purpose: string;
  otp: string;
};

export function hashOtpChallenge(params: OtpHashParams): string {
  return sha256(`${params.identifier}:${params.purpose}:${params.otp}:${env.OTP_HASH_PEPPER}`);
}

export function verifyOtpChallenge(params: OtpHashParams & { expectedHash: string }): boolean {
  const candidateHash = hashOtpChallenge({
    identifier: params.identifier,
    purpose: params.purpose,
    otp: params.otp
  });

  return safeEqual(candidateHash, params.expectedHash);
}
