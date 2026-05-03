"use client";

import { useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UploadImageResponse = {
  data: {
    url: string;
    secureUrl: string;
    publicId: string;
  };
};

type DeleteImageResponse = {
  data: {
    ok: boolean;
  };
};

type UploadedAsset = {
  url: string;
  secureUrl: string;
  publicId: string;
  uploadedAt: string;
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString();
}

export function AdminUploadsClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicIdToDelete, setPublicIdToDelete] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const latestUpload = useMemo(() => uploadedAssets[0] ?? null, [uploadedAssets]);

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(label);
      setMessage(`${label} copied.`);
      setError(null);
    } catch {
      setError("Unable to copy. Please copy manually.");
    }
  }

  async function onUpload() {
    if (!selectedFile) {
      setError("Please select an image file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);
    setCopiedValue(null);

    try {
      const response = await commerceApi.admin.uploads.uploadImage<UploadImageResponse>(selectedFile);
      const asset: UploadedAsset = {
        ...response.data,
        uploadedAt: new Date().toISOString()
      };
      setUploadedAssets((current) => [asset, ...current]);
      setMessage("Image uploaded successfully.");
      setSelectedFile(null);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "MISSING_FILE") {
          setError("Image file is required.");
          return;
        }
        if (error.code === "INVALID_FILE_TYPE") {
          setError("Unsupported image type. Please upload JPG, PNG, WEBP, AVIF, or GIF.");
          return;
        }
        if (error.code === "FILE_TOO_LARGE") {
          setError("File too large. Please upload a smaller image.");
          return;
        }
        setError(error.message);
      } else {
        setError("Image upload failed.");
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function onDelete() {
    const publicId = publicIdToDelete.trim();
    if (!publicId) {
      setError("Public ID is required for delete.");
      return;
    }

    if (!window.confirm(`Delete image with publicId "${publicId}"?`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      await commerceApi.admin.uploads.deleteImage<DeleteImageResponse>(publicId);
      setUploadedAssets((current) => current.filter((asset) => asset.publicId !== publicId));
      setMessage("Image delete request completed.");
      setPublicIdToDelete("");
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Image delete failed.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Uploads</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Upload images to Cloudinary and copy image URLs/public IDs for product and homepage forms.
        </p>

        {message ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            accept="image/*"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              setError(null);
              setMessage(null);
            }}
          />
          <Button type="button" disabled={isUploading} onClick={() => void onUpload()}>
            {isUploading ? "Uploading..." : "Upload Image"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
        <h2 className="text-2xl font-semibold">Delete by Public ID</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Use this if you need to remove an image from Cloudinary.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            placeholder="auraville/..."
            value={publicIdToDelete}
            onChange={(event) => setPublicIdToDelete(event.target.value)}
          />
          <Button type="button" variant="ghost" disabled={isDeleting} onClick={() => void onDelete()}>
            {isDeleting ? "Deleting..." : "Delete Image"}
          </Button>
        </div>
      </div>

      {latestUpload ? (
        <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
          <h2 className="text-2xl font-semibold">Latest Upload</h2>
          <p className="mt-2 text-xs text-[var(--muted)]">Uploaded at {formatDate(latestUpload.uploadedAt)}</p>

          <div className="mt-4 grid gap-3">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">URL</p>
              <p className="mt-1 break-all text-sm">{latestUpload.url}</p>
              <Button
                className="mt-2"
                type="button"
                variant="secondary"
                onClick={() => void copyToClipboard(latestUpload.url, "URL")}
              >
                Copy URL
              </Button>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Secure URL</p>
              <p className="mt-1 break-all text-sm">{latestUpload.secureUrl}</p>
              <Button
                className="mt-2"
                type="button"
                variant="secondary"
                onClick={() => void copyToClipboard(latestUpload.secureUrl, "Secure URL")}
              >
                Copy Secure URL
              </Button>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Public ID</p>
              <p className="mt-1 break-all text-sm">{latestUpload.publicId}</p>
              <Button
                className="mt-2"
                type="button"
                variant="secondary"
                onClick={() => void copyToClipboard(latestUpload.publicId, "Public ID")}
              >
                Copy Public ID
              </Button>
            </div>
          </div>

          {copiedValue ? <p className="mt-3 text-xs text-[var(--muted)]">Last copied: {copiedValue}</p> : null}
        </div>
      ) : null}

      {uploadedAssets.length > 1 ? (
        <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
          <h2 className="text-2xl font-semibold">Upload History (Current Session)</h2>
          <div className="mt-4 space-y-2">
            {uploadedAssets.map((asset) => (
              <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm" key={`${asset.publicId}-${asset.uploadedAt}`}>
                <p className="font-semibold">{asset.publicId}</p>
                <p className="mt-1 break-all text-xs text-[var(--muted)]">{asset.secureUrl}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
