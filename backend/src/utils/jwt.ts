import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { parseTtlToMs } from "./time";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  familyId: string;
  type: "refresh";
};

type JwtExpiresIn = NonNullable<Parameters<typeof jwt.sign>[2]>["expiresIn"];

function getExpiryDate(ttl: string): Date {
  return new Date(Date.now() + parseTtlToMs(ttl));
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  return jwt.sign(
    {
      ...payload,
      type: "access"
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL as JwtExpiresIn
    }
  );
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">): {
  token: string;
  expiresAt: Date;
} {
  const token = jwt.sign(
    {
      ...payload,
      type: "refresh"
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_TTL as JwtExpiresIn
    }
  );

  return {
    token,
    expiresAt: getExpiryDate(env.REFRESH_TOKEN_TTL)
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof decoded !== "object" || decoded.type !== "access") {
    throw new Error("Invalid access token");
  }

  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (typeof decoded !== "object" || decoded.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  return decoded as RefreshTokenPayload;
}
