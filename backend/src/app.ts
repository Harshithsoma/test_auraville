import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { globalRateLimiter } from "./middleware/rate-limit.middleware";
import { accountRouter } from "./modules/account/account.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { checkoutRouter } from "./modules/checkout/checkout.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { reviewsRouter } from "./modules/reviews/reviews.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { couponsRouter } from "./modules/coupons/coupons.routes";
import { homepageRouter } from "./modules/homepage/homepage.routes";
import { productsRouter } from "./modules/products/products.routes";
import { uploadsRouter } from "./modules/uploads/uploads.routes";
import { healthRouter } from "./routes/health.route";

function resolveTrustProxy(value: string): boolean | number | string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return value;
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", resolveTrustProxy(env.TRUST_PROXY));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", "data:"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          fontSrc: ["'none'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"]
        }
      },
      hsts:
        env.NODE_ENV === "production"
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true
            }
          : false,
      frameguard: {
        action: "deny"
      },
      noSniff: true,
      referrerPolicy: {
        policy: "no-referrer"
      }
    })
  );
  app.use(cors(corsOptions));
  app.use(globalRateLimiter);
  app.use("/payments/webhook/razorpay", express.raw({ type: "application/json", limit: "1mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use(healthRouter);
  app.use(adminRouter);
  app.use(productsRouter);
  app.use(categoriesRouter);
  app.use(cartRouter);
  app.use(couponsRouter);
  app.use(homepageRouter);
  app.use(authRouter);
  app.use(accountRouter);
  app.use(uploadsRouter);
  app.use(checkoutRouter);
  app.use(paymentsRouter);
  app.use(ordersRouter);
  app.use(reviewsRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
