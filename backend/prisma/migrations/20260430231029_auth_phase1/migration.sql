-- CreateEnum
CREATE TYPE "public"."AuthIdentifierType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "public"."OtpChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "public"."OtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "phoneNormalized" TEXT;

-- CreateTable
CREATE TABLE "public"."OtpChallenge" (
    "id" TEXT NOT NULL,
    "identifierType" "public"."AuthIdentifierType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "channel" "public"."OtpChannel" NOT NULL,
    "purpose" "public"."OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PendingSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "otpChallengeId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpChallenge_identifier_purpose_createdAt_idx" ON "public"."OtpChallenge"("identifier", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "public"."OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_consumedAt_idx" ON "public"."OtpChallenge"("consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingSignup_otpChallengeId_key" ON "public"."PendingSignup"("otpChallengeId");

-- CreateIndex
CREATE INDEX "PendingSignup_email_idx" ON "public"."PendingSignup"("email");

-- CreateIndex
CREATE INDEX "PendingSignup_phoneNormalized_idx" ON "public"."PendingSignup"("phoneNormalized");

-- CreateIndex
CREATE INDEX "PendingSignup_expiresAt_idx" ON "public"."PendingSignup"("expiresAt");
