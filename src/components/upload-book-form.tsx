"use client";

import { upload } from "@vercel/blob/client";
import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addBookAction } from "@/app/actions";
import { makeFileKey, titleFromFilename } from "@/lib/file-key";
import { uploadCoverFromFile } from "@/lib/pdf-cover";

/** Uploads a PDF (straight to Vercel Blob, or to /api/upload locally), then creates the book. */
export function UploadBookForm({ direct }: { direct: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ busy?: boolean; progress?: number; error?: string; message?: string }>({});

  async function storeFile(f: File): Promise<string> {
    if (direct) {
      const key = makeFileKey(f.name, crypto.randomUUID().replace(/-/g, "").slice(0, 12));
      const blob = await upload(key, f, {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: "application/pdf",
        multipart: f.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setStatus({ busy: true, progress: percentage }),
      });
      return blob.pathname;
    }
    const body = new FormData();
    body.set("file", f);
    const res = await fetch("/api/upload", { method: "POST", body });
    const json = (await res.json()) as { key?: string; error?: string };
    if (!res.ok || !json.key) throw new Error(json.error ?? "Upload failed");
    return json.key;
  }

  async function submit(form: FormData) {
    if (!file) return;
    setStatus({ busy: true });
    try {
      const fileKey = await storeFile(file);
      const result = await addBookAction({
        fileKey,
        title: String(form.get("title") || titleFromFilename(file.name)),
        tags: String(form.get("tags") ?? ""),
      });
      if (result.error) throw new Error(result.error);
      if (result.id) await uploadCoverFromFile(result.id, file);
      setFile(null);
      setStatus({ message: result.message });
      router.refresh();
    } catch (err) {
      setStatus({ error: (err as Error).message });
    }
  }

  return (
    <form action={submit} className="space-y-2 rounded-xl border border-line bg-surface p-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted hover:border-accent">
        <FileUp size={18} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{file ? file.name : "Choose a PDF book…"}</span>
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            setFile(e.currentTarget.files?.[0] ?? null);
            setStatus({});
          }}
        />
      </label>
      {file && (
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
          <input
            key={file.name}
            name="title"
            defaultValue={titleFromFilename(file.name)}
            aria-label="Title"
            className="input"
          />
          <input name="tags" placeholder="tags" aria-label="Tags" className="input" />
          <button type="submit" disabled={status.busy} className="btn-primary">
            {status.busy ? (status.progress ? `Uploading ${Math.round(status.progress)}%` : "Uploading…") : "Upload"}
          </button>
        </div>
      )}
      {status.error && <p className="text-sm text-red-600">{status.error}</p>}
      {status.message && <p className="text-sm text-ok">{status.message}</p>}
    </form>
  );
}
