import type { RequestHandler } from "express";
import { HttpError } from "../../utils/http-error";
import { deleteImageFromCloudinary, uploadImageToCloudinary } from "./uploads.service";
import type { DeleteImageValidatedInput } from "./uploads.validation";

export const uploadImageController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError(400, "Image file is required", undefined, "MISSING_FILE");
    }

    const result = await uploadImageToCloudinary({
      buffer: req.file.buffer
    });

    res.status(201).json({
      data: {
        url: result.url,
        publicId: result.publicId,
        secureUrl: result.secureUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteImageController: RequestHandler = async (req, res, next) => {
  try {
    const { body } = req as unknown as DeleteImageValidatedInput;
    await deleteImageFromCloudinary(body.publicId);

    res.status(200).json({
      data: {
        ok: true
      }
    });
  } catch (error) {
    next(error);
  }
};
