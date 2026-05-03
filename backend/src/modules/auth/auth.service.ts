import { AuthIdentifierType, OtpChannel, OtpPurpose } from "@prisma/client";
import { randomInt, randomUUID } from "crypto";
import { env } from "../../config/env";
import { prisma } from "../../prisma/prisma.service";
import { resolveIdentifier } from "../../utils/identifier";
import { sha256, safeEqual } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { hashOtpChallenge, verifyOtpChallenge, generateOtpCode } from "../../utils/otp-challenge";
import { sendEmailOtp } from "../../utils/otp-delivery";
import { passwordHash, verifyPassword } from "../../utils/password";
import { normalizePhone } from "../../utils/phone";
import { HttpError } from "../../utils/http-error";
import type {
  AuthMessageResponse,
  AuthUserResponse,
  MeResponse,
  VerifyOtpResponse
} from "./auth.types";

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }

  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, localPart.length - 2))}@${domain}`;
}

function hashOtp(email: string, otp: string): string {
  return sha256(`${email}:${otp}:${env.OTP_HASH_PEPPER}`);
}

function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function mapUser(user: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
}): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role
  };
}

async function revokeFamily(userId: string, familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      familyId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

async function createSession(params: {
  user: { id: string; email: string; role: "USER" | "ADMIN"; name: string | null; phone: string | null };
  familyId?: string;
}): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
  const familyId = params.familyId ?? randomUUID();

  const { token: refreshToken, expiresAt: refreshExpiresAt } = signRefreshToken({
    sub: params.user.id,
    familyId
  });

  await prisma.refreshToken.create({
    data: {
      userId: params.user.id,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshExpiresAt
    }
  });

  const accessToken = signAccessToken({
    sub: params.user.id,
    email: params.user.email,
    role: params.user.role
  });

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt
  };
}

function getOtpExpiry(): Date {
  return new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
}

function assertOtpChallengeUsable(challenge: {
  id: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  maxAttempts: number;
}): void {
  if (challenge.consumedAt !== null || challenge.expiresAt < new Date()) {
    throw new HttpError(400, "Invalid or expired OTP");
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new HttpError(400, "OTP attempt limit exceeded");
  }
}

async function findActiveUserByIdentifier(params: { identifierType: "EMAIL" | "PHONE"; value: string }) {
  if (params.identifierType === "EMAIL") {
    return prisma.user.findUnique({
      where: {
        email: params.value
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        passwordHash: true
      }
    });
  }

  return prisma.user.findFirst({
    where: {
      OR: [{ phoneNormalized: params.value }, { phone: params.value }]
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      passwordHash: true
    }
  });
}

function buildAuthSuccessResponse(params: {
  user: { id: string; email: string; name: string | null; phone: string | null; role: "USER" | "ADMIN" };
  accessToken: string;
}): VerifyOtpResponse {
  return {
    data: {
      user: mapUser(params.user),
      accessToken: params.accessToken
    }
  };
}

export async function sendOtp(email: string): Promise<void> {
  const otp = generateOtp();
  const otpHash = hashOtp(email, otp);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: {
        email,
        consumedAt: null
      },
      data: {
        consumedAt: new Date()
      }
    }),
    prisma.otpCode.create({
      data: {
        email,
        codeHash: otpHash,
        expiresAt,
        attempts: 0
      }
    })
  ]);

  if (env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`OTP generated for ${maskEmail(email)}: ${otp}`);
  }
}

export async function verifyOtp(params: {
  email: string;
  otp: string;
  name?: string;
  phone?: string;
}): Promise<VerifyOtpResponse & { refreshToken: string; refreshExpiresAt: Date }> {
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      email: params.email,
      consumedAt: null
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!otpRecord) {
    throw new HttpError(400, "Invalid or expired OTP");
  }

  if (otpRecord.expiresAt < new Date()) {
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() }
    });
    throw new HttpError(400, "Invalid or expired OTP");
  }

  if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new HttpError(400, "OTP attempt limit exceeded");
  }

  const submittedHash = hashOtp(params.email, params.otp);

  if (!safeEqual(submittedHash, otpRecord.codeHash)) {
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: {
        attempts: {
          increment: 1
        }
      }
    });
    throw new HttpError(400, "Invalid or expired OTP");
  }

  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: {
      consumedAt: new Date()
    }
  });

  const user = await prisma.user.upsert({
    where: {
      email: params.email
    },
    create: {
      email: params.email,
      name: params.name,
      phone: params.phone,
      role: "USER"
    },
    update: {
      ...(params.name ? { name: params.name } : {}),
      ...(params.phone ? { phone: params.phone } : {})
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true
    }
  });

  const session = await createSession({ user });

  return {
    data: {
      user: mapUser(user),
      accessToken: session.accessToken
    },
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt
  };
}

export async function signupOtpSend(params: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthMessageResponse> {
  const email = params.email.trim().toLowerCase();
  const phoneNormalized = normalizePhone(params.phone);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phoneNormalized }, { phone: phoneNormalized }]
    },
    select: { id: true }
  });

  if (existingUser) {
    throw new HttpError(
      409,
      "An account already exists with these details. Please log in.",
      undefined,
      "ACCOUNT_EXISTS"
    );
  }

  const hashedPassword = await passwordHash(params.password);
  const otp = generateOtpCode();
  const expiresAt = getOtpExpiry();
  const codeHash = hashOtpChallenge({
    identifier: email,
    purpose: OtpPurpose.SIGNUP,
    otp
  });

  await prisma.$transaction(async (tx) => {
    await tx.pendingSignup.updateMany({
      where: {
        OR: [{ email }, { phoneNormalized }],
        consumedAt: null
      },
      data: {
        consumedAt: new Date()
      }
    });

    await tx.otpChallenge.updateMany({
      where: {
        identifierType: AuthIdentifierType.EMAIL,
        identifier: email,
        purpose: OtpPurpose.SIGNUP,
        consumedAt: null
      },
      data: {
        consumedAt: new Date()
      }
    });

    const challenge = await tx.otpChallenge.create({
      data: {
        identifierType: AuthIdentifierType.EMAIL,
        identifier: email,
        channel: OtpChannel.EMAIL,
        purpose: OtpPurpose.SIGNUP,
        codeHash,
        expiresAt,
        maxAttempts: env.OTP_MAX_ATTEMPTS
      }
    });

    await tx.pendingSignup.create({
      data: {
        email,
        phoneNormalized,
        name: params.name.trim(),
        passwordHash: hashedPassword,
        otpChallengeId: challenge.id,
        expiresAt
      }
    });
  });

  try {
    await sendEmailOtp({
      email,
      otp,
      purpose: "SIGNUP"
    });
  } catch {
    throw new HttpError(503, "Unable to send OTP right now. Please try again.", undefined, "OTP_SEND_FAILED");
  }

  return {
    data: {
      message: "OTP sent for signup verification"
    }
  };
}

export async function signupOtpVerify(params: {
  phone?: string;
  email?: string;
  otp: string;
}): Promise<VerifyOtpResponse & { refreshToken: string; refreshExpiresAt: Date }> {
  const email = params.email?.trim().toLowerCase();
  const phoneNormalized = params.phone ? normalizePhone(params.phone) : null;
  const pendingSignup = await prisma.pendingSignup.findFirst({
    where: {
      consumedAt: null,
      ...(email ? { email } : { phoneNormalized: phoneNormalized ?? "" })
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!pendingSignup || pendingSignup.expiresAt < new Date()) {
    if (pendingSignup) {
      await prisma.pendingSignup.update({
        where: { id: pendingSignup.id },
        data: { consumedAt: new Date() }
      });
    }
    throw new HttpError(400, "Invalid or expired OTP");
  }

  const challenge = await prisma.otpChallenge.findUnique({
    where: {
      id: pendingSignup.otpChallengeId
    }
  });

  if (
    !challenge ||
    challenge.purpose !== OtpPurpose.SIGNUP
  ) {
    throw new HttpError(400, "Invalid or expired OTP");
  }

  assertOtpChallengeUsable(challenge);
  const verificationIdentifier = challenge.identifier;

  const isValidOtp = verifyOtpChallenge({
    identifier: verificationIdentifier,
    purpose: OtpPurpose.SIGNUP,
    otp: params.otp,
    expectedHash: challenge.codeHash
  });

  if (!isValidOtp) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: {
          increment: 1
        }
      }
    });
    throw new HttpError(400, "Invalid or expired OTP");
  }

  const user = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findFirst({
      where: {
        OR: [{ email: pendingSignup.email }, { phoneNormalized: pendingSignup.phoneNormalized }]
      },
      select: { id: true }
    });

    if (existingUser) {
      throw new HttpError(
        409,
        "An account already exists with these details. Please log in.",
        undefined,
        "ACCOUNT_EXISTS"
      );
    }

    const createdUser = await tx.user.create({
      data: {
        email: pendingSignup.email,
        name: pendingSignup.name,
        phone: pendingSignup.phoneNormalized,
        phoneNormalized: pendingSignup.phoneNormalized,
        passwordHash: pendingSignup.passwordHash,
        role: "USER",
        lastLoginAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true
      }
    });

    await tx.pendingSignup.update({
      where: { id: pendingSignup.id },
      data: { consumedAt: new Date() }
    });

    await tx.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() }
    });

    return createdUser;
  });

  const session = await createSession({ user });

  return {
    data: buildAuthSuccessResponse({
      user,
      accessToken: session.accessToken
    }).data,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt
  };
}

export async function loginOtpSend(params: { identifier: string }): Promise<AuthMessageResponse> {
  const identifier = resolveIdentifier(params.identifier);
  const user = await findActiveUserByIdentifier(identifier);

  if (!user || !user.isActive) {
    throw new HttpError(
      404,
      "No account found with these details. Please create an account.",
      undefined,
      "USER_NOT_FOUND"
    );
  }

  const otpDestinationEmail = identifier.identifierType === "EMAIL" ? identifier.value : user.email;

  const otp = generateOtpCode();
  const expiresAt = getOtpExpiry();
  const codeHash = hashOtpChallenge({
    identifier: otpDestinationEmail,
    purpose: OtpPurpose.LOGIN,
    otp
  });

  await prisma.$transaction(async (tx) => {
    await tx.otpChallenge.updateMany({
      where: {
        identifierType: AuthIdentifierType.EMAIL,
        identifier: otpDestinationEmail,
        purpose: OtpPurpose.LOGIN,
        consumedAt: null
      },
      data: {
        consumedAt: new Date()
      }
    });

    await tx.otpChallenge.create({
      data: {
        identifierType: AuthIdentifierType.EMAIL,
        identifier: otpDestinationEmail,
        channel: OtpChannel.EMAIL,
        purpose: OtpPurpose.LOGIN,
        codeHash,
        expiresAt,
        maxAttempts: env.OTP_MAX_ATTEMPTS
      }
    });
  });

  try {
    await sendEmailOtp({
      email: otpDestinationEmail,
      otp,
      purpose: "LOGIN"
    });
  } catch {
    throw new HttpError(503, "Unable to send OTP right now. Please try again.", undefined, "OTP_SEND_FAILED");
  }

  return {
    data: {
      message: "OTP sent for login verification"
    }
  };
}

export async function loginOtpVerify(params: {
  identifier: string;
  otp: string;
}): Promise<VerifyOtpResponse & { refreshToken: string; refreshExpiresAt: Date }> {
  const identifier = resolveIdentifier(params.identifier);
  const user = await findActiveUserByIdentifier(identifier);

  if (!user || !user.isActive) {
    throw new HttpError(
      404,
      "No account found with these details. Please create an account.",
      undefined,
      "USER_NOT_FOUND"
    );
  }

  const otpIdentifier = identifier.identifierType === "EMAIL" ? identifier.value : user.email;

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      identifierType: AuthIdentifierType.EMAIL,
      identifier: otpIdentifier,
      purpose: OtpPurpose.LOGIN,
      consumedAt: null
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!challenge) {
    throw new HttpError(400, "Invalid or expired OTP");
  }

  assertOtpChallengeUsable(challenge);

  const isValidOtp = verifyOtpChallenge({
    identifier: otpIdentifier,
    purpose: OtpPurpose.LOGIN,
    otp: params.otp,
    expectedHash: challenge.codeHash
  });

  if (!isValidOtp) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: {
          increment: 1
        }
      }
    });
    throw new HttpError(400, "Invalid or expired OTP");
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() }
    });

    return tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true
      }
    });
  });

  const session = await createSession({ user: updatedUser });

  return {
    data: buildAuthSuccessResponse({
      user: updatedUser,
      accessToken: session.accessToken
    }).data,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt
  };
}

export async function loginWithPassword(params: {
  identifier: string;
  password: string;
}): Promise<VerifyOtpResponse & { refreshToken: string; refreshExpiresAt: Date }> {
  const identifier = resolveIdentifier(params.identifier);
  const user = await findActiveUserByIdentifier(identifier);

  if (!user || !user.isActive || !user.passwordHash) {
    throw new HttpError(401, "Invalid credentials", undefined, "INVALID_CREDENTIALS");
  }

  const isValid = await verifyPassword(params.password, user.passwordHash);

  if (!isValid) {
    throw new HttpError(401, "Invalid credentials", undefined, "INVALID_CREDENTIALS");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true
    }
  });

  const session = await createSession({ user: updatedUser });

  return {
    data: buildAuthSuccessResponse({
      user: updatedUser,
      accessToken: session.accessToken
    }).data,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt
  };
}

export async function refreshSession(refreshToken: string): Promise<
  VerifyOtpResponse & { refreshToken: string; refreshExpiresAt: Date }
> {
  let payload: { sub: string; familyId: string; type: "refresh" };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Unauthorized");
  }

  const tokenHash = sha256(refreshToken);

  const existing = await prisma.refreshToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true
        }
      }
    }
  });

  if (!existing) {
    await revokeFamily(payload.sub, payload.familyId);
    throw new HttpError(401, "Unauthorized");
  }

  if (existing.revokedAt !== null || existing.expiresAt < new Date()) {
    await revokeFamily(existing.userId, existing.familyId);
    throw new HttpError(401, "Unauthorized");
  }

  if (existing.familyId !== payload.familyId || existing.userId !== payload.sub) {
    await revokeFamily(existing.userId, existing.familyId);
    throw new HttpError(401, "Unauthorized");
  }

  if (!existing.user) {
    throw new HttpError(401, "Unauthorized");
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date()
    }
  });

  const session = await createSession({
    user: existing.user,
    familyId: existing.familyId
  });

  return {
    data: {
      user: mapUser(existing.user),
      accessToken: session.accessToken
    },
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.refreshExpiresAt
  };
}

export async function logoutSession(refreshToken?: string): Promise<void> {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = sha256(refreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash }
    });

    if (!tokenRecord) {
      await revokeFamily(payload.sub, payload.familyId);
      return;
    }

    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date()
      }
    });
  } catch {
    // ignore invalid token during logout; cookie will still be cleared
  }
}

export function getMe(user: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
}): MeResponse {
  return {
    data: {
      user: mapUser(user)
    }
  };
}
