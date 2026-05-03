import type { RequestHandler } from "express";
import { HttpError } from "../../utils/http-error";
import { createReview, listApprovedReviews } from "./reviews.service";
import type { CreateReviewValidatedInput, ListReviewsValidatedInput } from "./reviews.validation";

export const createReviewController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const { body } = req as unknown as CreateReviewValidatedInput;
    const result = await createReview({
      user: req.authUser,
      payload: body
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const listReviewsController: RequestHandler = async (req, res, next) => {
  try {
    const { query } = req as unknown as ListReviewsValidatedInput;
    const result = await listApprovedReviews(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
