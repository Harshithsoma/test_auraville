import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOptions } from "./config/cors";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { globalRateLimiter } from "./middleware/rate-limit.middleware";
import { cartRouter } from "./modules/cart/cart.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { checkoutRouter } from "./modules/checkout/checkout.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { reviewsRouter } from "./modules/reviews/reviews.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { couponsRouter } from "./modules/coupons/coupons.routes";
import { productsRouter } from "./modules/products/products.routes";
import { uploadsRouter } from "./modules/uploads/uploads.routes";
import { healthRouter } from "./routes/health.route";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
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
  app.use(authRouter);
  app.use(uploadsRouter);
  app.use(checkoutRouter);
  app.use(paymentsRouter);
  app.use(ordersRouter);
  app.use(reviewsRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
