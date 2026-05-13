import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  createReviewController,
  createVerifiedFromLinkController,
  createVerifiedRatingController,
  getVerifiedPromptController,
  listReviewsController,
  updateVerifiedFromLinkTextController,
  updateVerifiedReviewTextController
} from "./reviews.controller";
import {
  createReviewSchema,
  listReviewsSchema,
  verifiedFromLinkSchema,
  verifiedFromLinkTextSchema,
  verifiedPromptSchema,
  verifiedRateSchema,
  verifiedTextSchema
} from "./reviews.validation";

export const reviewsRouter = Router();

reviewsRouter.post("/reviews", validateRequest(createReviewSchema), requireAuth, createReviewController);
reviewsRouter.get("/reviews", validateRequest(listReviewsSchema), listReviewsController);
reviewsRouter.get(
  "/reviews/verified/prompt",
  validateRequest(verifiedPromptSchema),
  requireAuth,
  getVerifiedPromptController
);
reviewsRouter.post(
  "/reviews/verified/rate",
  validateRequest(verifiedRateSchema),
  requireAuth,
  createVerifiedRatingController
);
reviewsRouter.patch(
  "/reviews/verified/text",
  validateRequest(verifiedTextSchema),
  requireAuth,
  updateVerifiedReviewTextController
);
reviewsRouter.post(
  "/reviews/verified/from-link",
  validateRequest(verifiedFromLinkSchema),
  createVerifiedFromLinkController
);
reviewsRouter.patch(
  "/reviews/verified/from-link/text",
  validateRequest(verifiedFromLinkTextSchema),
  updateVerifiedFromLinkTextController
);
