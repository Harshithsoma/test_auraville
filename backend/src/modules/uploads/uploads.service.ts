import { cloudinary } from "../../config/cloudinary";
import { HttpError } from "../../utils/http-error";

export type UploadedImageResult = {
  url: string;
  secureUrl: string;
  publicId: string;
};

export async function uploadImageToCloudinary(params: {
  buffer: Buffer;
}): Promise<UploadedImageResult> {
  const { buffer } = params;

  return new Promise<UploadedImageResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "auraville",
        resource_type: "image",
        overwrite: false
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new HttpError(
              502,
              "Image upload failed",
              { provider: "cloudinary", message: error?.message },
              "IMAGE_UPLOAD_FAILED"
            )
          );
          return;
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true
    });

    if (result.result !== "ok" && result.result !== "not found") {
      throw new HttpError(
        502,
        "Image delete failed",
        { provider: "cloudinary", result: result.result, publicId },
        "IMAGE_DELETE_FAILED"
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      502,
      "Image delete failed",
      { provider: "cloudinary", publicId },
      "IMAGE_DELETE_FAILED"
    );
  }
}
