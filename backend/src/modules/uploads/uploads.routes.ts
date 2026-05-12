import { Router, type RequestHandler } from "express";
import multer from "multer";
import { requireAdmin, requireAuth } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { HttpError } from "../../utils/http-error";
import { deleteImageController, uploadImageController } from "./uploads.controller";
import { deleteImageSchema } from "./uploads.validation";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new HttpError(400, "Unsupported image type", { mimetype: file.mimetype }, "INVALID_FILE_TYPE"));
      return;
    }

    cb(null, true);
  }
});

const singleImageUploadMiddleware: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(
        new HttpError(
          400,
          "Image file too large",
          { maxBytes: MAX_IMAGE_SIZE_BYTES },
          "FILE_TOO_LARGE"
        )
      );
      return;
    }

    next(error);
  });
};

export const uploadsRouter = Router();

uploadsRouter.post(
  "/admin/uploads/image",
  requireAuth,
  requireAdmin,
  singleImageUploadMiddleware,
  uploadImageController
);

uploadsRouter.delete(
  "/admin/uploads/image",
  requireAuth,
  requireAdmin,
  validateRequest(deleteImageSchema),
  deleteImageController
);
