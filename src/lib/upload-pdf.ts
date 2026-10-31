import { upload } from "@vercel/blob/client";
import { makeFileKey } from "./file-key";

/**
 * Stores a PDF and returns its storage key: straight from the browser to
 * Vercel Blob when `direct` (no 4.5 MB function limit), else via /api/upload.
 */
export async function uploadPdf(file: File, direct: boolean, onProgress: (percent: number) => void): Promise<string> {
  if (direct) {
    const key = makeFileKey(file.name, crypto.randomUUID().replace(/-/g, "").slice(0, 12));
    const blob = await upload(key, file, {
      access: "private",
      handleUploadUrl: "/api/upload",
      contentType: "application/pdf",
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress(percentage),
    });
    return blob.pathname;
  }
  return uploadLocal(file, onProgress);
}

/** Local-disk upload with progress (fetch can't report upload progress, XHR can). */
function uploadLocal(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => {
      const json = (xhr.response ?? {}) as { key?: string; error?: string };
      if (xhr.status < 300 && json.key) resolve(json.key);
      else reject(new Error(json.error ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed, check your connection"));
    const body = new FormData();
    body.set("file", file);
    xhr.send(body);
  });
}
