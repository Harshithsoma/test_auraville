import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { createReviewController, listReviewsController } from "./reviews.controller";
import { createReviewSchema, listReviewsSchema } from "./reviews.validation";

export const reviewsRouter = Router();

reviewsRouter.post("/reviews", validateRequest(createReviewSchema), requireAuth, createReviewController);
reviewsRouter.get("/reviews", validateRequest(listReviewsSchema), listReviewsController);
