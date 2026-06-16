import type { ImagePickerAsset } from "expo-image-picker";

import { supabase } from "@/lib/supabase";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type UploadImageAssetOptions = {
  asset: ImagePickerAsset;
  bucket: "post-images" | "profile-images";
  userId: string;
  prefix: string;
  maxBytes: number;
};

function sanitizeExtension(extension: string | null | undefined) {
  const clean = (extension || "").replace(".", "").toLowerCase();
  if (clean === "jpeg") return "jpg";
  if (["jpg", "png", "webp"].includes(clean)) return clean;
  return null;
}

function extensionFromUri(uri: string) {
  const cleanUri = uri.split("?")[0] || "";
  const lastDotIndex = cleanUri.lastIndexOf(".");

  if (lastDotIndex === -1) return null;

  return sanitizeExtension(cleanUri.slice(lastDotIndex + 1));
}

function inferMimeType(asset: ImagePickerAsset) {
  if (asset.mimeType && ALLOWED_IMAGE_MIME_TYPES.includes(asset.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return asset.mimeType;
  }

  const extension = sanitizeExtension(asset.fileName?.split(".").pop()) || extensionFromUri(asset.uri);

  if (extension === "jpg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";

  return null;
}

function getFileExtension(asset: ImagePickerAsset) {
  const fromFileName = sanitizeExtension(asset.fileName?.split(".").pop());
  if (fromFileName) return fromFileName;

  const fromUri = extensionFromUri(asset.uri);
  if (fromUri) return fromUri;

  const mimeType = inferMimeType(asset);
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function getFriendlyImageError(message?: string, fallback = "Gorsel islenemedi.") {
  if (!message) return fallback;

  if (message.includes("Network request failed")) {
    return "Gorsel okunamadi. Lutfen tekrar dene.";
  }

  return message;
}

export function getStoragePathFromPublicUrl(publicUrl: string, bucket: "post-images" | "profile-images") {
  const marker = `/${bucket}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) return null;

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length).split("?")[0] || "");
}

export async function deleteStorageObjectFromPublicUrl({
  bucket,
  publicUrl,
  expectedUserId,
}: {
  bucket: "post-images" | "profile-images";
  publicUrl: string | null | undefined;
  expectedUserId: string;
}) {
  if (!publicUrl) return;

  const storagePath = getStoragePathFromPublicUrl(publicUrl, bucket);
  if (!storagePath || !storagePath.startsWith(`${expectedUserId}/`)) return;

  await supabase.storage.from(bucket).remove([storagePath]);
}

export async function uploadImageAsset({
  asset,
  bucket,
  userId,
  prefix,
  maxBytes,
}: UploadImageAssetOptions) {
  if (!asset.uri) {
    throw new Error("Gorsel secilemedi.");
  }

  const mimeType = inferMimeType(asset);

  if (!mimeType) {
    throw new Error("Sadece JPG, PNG veya WEBP gorsel yukleyebilirsin.");
  }

  if (asset.fileSize && asset.fileSize > maxBytes) {
    const sizeMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Gorsel en fazla ${sizeMb} MB olabilir.`);
  }

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > maxBytes) {
    const sizeMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Gorsel en fazla ${sizeMb} MB olabilir.`);
  }

  const extension = getFileExtension(asset);
  const filePath = `${userId}/${prefix}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
    cacheControl: "3600",
    upsert: true,
    contentType: mimeType,
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}
