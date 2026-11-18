import axios, { isAxiosError, type AxiosInstance } from "axios";
import type { MediaType } from "./listings";

// Size limits checked in the browser before uploading.
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

// What POST /media/signature on our server answers.
type UploadSignature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

// Uploads one photo or video to Cloudinary and returns where it can be found.
// Steps: ask our server for permission (needs login) -> send the file straight to Cloudinary.
// `api` must be the logged-in client from createApi(getToken).
export async function uploadMedia(
  api: AxiosInstance,
  file: File,
  // Called while the file is on its way, with 0 to 100.
  onProgress?: (percent: number) => void,
): Promise<{ url: string; mediaType: MediaType }> {
  const mediaType: MediaType = file.type.startsWith("video/")
    ? "video"
    : "image";
  if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
    throw new Error("Only photos and videos can be uploaded.");
  }
  const limit = mediaType === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (file.size > limit * 1024 * 1024) {
    throw new Error(`${file.name} is bigger than ${limit} MB.`);
  }

  // 1. Permission from our server.
  const { data: permit } = await api.post<UploadSignature>("/media/signature", {
    mediaType,
  });

  // 2. The file goes to Cloudinary. A plain axios call is used on purpose:
  // our login token must never be sent to another website.
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", permit.apiKey);
  form.append("timestamp", String(permit.timestamp));
  form.append("folder", permit.folder);
  form.append("signature", permit.signature);

  const { data } = await axios.post<{ secure_url: string }>(
    permit.uploadUrl,
    form,
    {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    },
  );
  return { url: data.secure_url, mediaType };
}

// Turns an upload error into one short sentence that says what really went wrong,
// so the owner (and the developer) are not left with just "it failed".
export function describeUploadError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      { error?: { message?: string }; message?: string | string[] } | undefined;

    // Cloudinary explains itself like { error: { message: "Invalid Signature ..." } }.
    if (data?.error?.message) {
      return `Cloudinary says: ${data.error.message}`;
    }
    // Our own server answers like { message: "..." } (or a list of messages).
    if (data?.message) {
      const text = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;
      return error.response?.status === 401
        ? "You are not signed in. Sign in again and retry."
        : `Our server says: ${text}`;
    }
    if (error.response) {
      return `The upload was refused (HTTP ${error.response.status}).`;
    }
    // No answer at all: the request never got through.
    return "Could not reach the server. Check your internet and that the server is running.";
  }
  return error instanceof Error ? error.message : "Upload failed.";
}
