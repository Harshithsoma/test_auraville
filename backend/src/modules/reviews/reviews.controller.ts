import type { RequestHandler } from "express";
import { HttpError } from "../../utils/http-error";
import {
  createReview,
  createVerifiedReviewFromEmailLink,
  createVerifiedReviewRating,
  getVerifiedReviewPrompt,
  listApprovedReviews,
  updateVerifiedReviewTextFromEmailLink,
  updateVerifiedReviewText
} from "./reviews.service";
import type {
  CreateReviewValidatedInput,
  ListReviewsValidatedInput,
  VerifiedFromLinkValidatedInput,
  VerifiedFromLinkTextValidatedInput,
  VerifiedPromptValidatedInput,
  VerifiedRateValidatedInput,
  VerifiedTextValidatedInput
} from "./reviews.validation";

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

export const createVerifiedRatingController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const { body } = req as unknown as VerifiedRateValidatedInput;
    const result = await createVerifiedReviewRating({
      user: req.authUser,
      payload: body
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateVerifiedReviewTextController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    const { body } = req as unknown as VerifiedTextValidatedInput;
    const result = await updateVerifiedReviewText({
      user: req.authUser,
      payload: body
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getVerifiedPromptController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.authUser) {
      throw new HttpError(401, "Unauthorized");
    }

    req as unknown as VerifiedPromptValidatedInput;
    const result = await getVerifiedReviewPrompt(req.authUser);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createVerifiedFromLinkController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as VerifiedFromLinkValidatedInput;
    const result = await createVerifiedReviewFromEmailLink({
      token: body.token,
      rating: body.rating
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateVerifiedFromLinkTextController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as VerifiedFromLinkTextValidatedInput;
    const result = await updateVerifiedReviewTextFromEmailLink({
      token: body.token,
      reviewId: body.reviewId,
      subject: body.subject,
      body: body.body
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
