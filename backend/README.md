# Auraville Backend

Production-focused backend for Auraville ecommerce using:
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT auth with HTTP-only refresh cookie
- Razorpay order/payment verification + webhook handling
- Cloudinary image upload/delete

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## Environment Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill all required values in `.env`:
- App: `NODE_ENV`, `PORT`, `FRONTEND_URL`
- Database: `DATABASE_URL`
- Auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `OTP_TTL_MINUTES`, `OTP_MAX_ATTEMPTS`, `OTP_HASH_PEPPER`, `REFRESH_COOKIE_NAME`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_API_BASE_URL`, `RAZORPAY_WEBHOOK_SECRET`

Do not commit real secrets.

## Install

```bash
npm install
```

## Scripts

- `npm run dev` start dev server with watch
- `npm run build` compile TypeScript to `dist`
- `npm run start` run compiled server
- `npm run typecheck` run strict TypeScript check
- `npm run prisma:generate` generate Prisma client
- `npm run prisma:validate` validate Prisma schema
- `npm run prisma:migrate:dev` create/apply local migrations
- `npm run prisma:migrate:deploy` apply committed migrations in production
- `npm run prisma:seed` seed database

## Local Database Workflow

Generate Prisma client:

```bash
npm run prisma:generate
```

Create/apply migrations locally:

```bash
npm run prisma:migrate:dev
```

Seed data:

```bash
npm run prisma:seed
```

Run app:

```bash
npm run dev
```

## Production Readiness Notes

- Security:
  - `helmet()` enabled
  - strict CORS allows only `FRONTEND_URL`
  - refresh token cookie is `httpOnly`, `secure` in production, and `sameSite=none` in production
  - rate limiting enabled globally and on sensitive routes
  - all `/admin/*` routes require `requireAuth + requireAdmin`
  - Razorpay webhook route uses raw body parser before `express.json`

- Deployment order:
  1. Set all required environment variables
  2. Run `npm run prisma:generate`
  3. Run `npm run prisma:migrate:deploy`
  4. Optionally run `npm run prisma:seed` (only where appropriate)
  5. Run `npm run build`
  6. Run `npm run start`

- Current prerequisite:
  - `prisma/migrations` is not committed yet in this workspace.
  - Before production deploy, run `npm run prisma:migrate:dev -- --name init` (or appropriate migration name) and commit generated `prisma/migrations/*`.

## Health Check

`GET /health` response:

```json
{
  "data": {
    "status": "ok"
  }
}
```
