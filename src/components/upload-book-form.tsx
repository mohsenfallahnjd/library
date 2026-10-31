"use client";

import { clsx } from "clsx";
import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addBookAction } from "@/app/actions";
import { titleFromFilename } from "@/lib/file-key";
import { uploadCoverFromFile } from "@/lib/pdf-cover";
import { uploadPdf } from "@/lib/upload-pdf";
import { Spinner } from "./spinner";

export type Phase = "upload" | "save" | "cover";
export const PHASE_LABEL: Record<Phase, string> = { upload: "Uploading", save: "Saving", cover: "Making cover" };

/** Uploads a PDF (straight to Vercel Blob, or to /api/upload locally), then creates the book. */
export function UploadBookForm({ direct }: { direct: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ phase?: Phase; progress?: number; error?: string; message?: string }>({});
  const busy = Boolean(status.phase);

  async function submit(form: FormData) {
    if (!file) return;
    setStatus({ phase: "upload", progress: 0 });
    try {
      const fileKey = await uploadPdf(file, direct, (progress) => setStatus({ phase: "upload", progress }));
      setStatus({ phase: "save" });
      const result = await addBookAction({
        fileKey,
        title: String(form.get("title") || titleFromFilename(file.name)),
        tags: String(form.get("tags") ?? ""),
      });
      if (result.error) throw new Error(result.error);
      if (result.id) {
        setStatus({ phase: "cover" });
        await uploadCoverFromFile(result.id, file);
      }
      setFile(null);
      setStatus({ message: result.message });
      router.refresh();
    } catch (err) {
      setStatus({ error: (err as Error).message });
    }
  }

  return (
    <form action={submit} className="space-y-2 rounded-xl border border-line bg-surface p-3">
      <label
        className={clsx(
          "flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted",
          busy ? "cursor-default opacity-60" : "cursor-pointer hover:border-accent",
        )}
      >
        <FileUp size={18} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{file ? file.name : "Choose a PDF book…"}</span>
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={busy}
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
            disabled={busy}
            className="input"
          />
          <input name="tags" placeholder="tags" aria-label="Tags" disabled={busy} className="input" />
          <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary min-w-32">
            {status.phase ? (
              <>
                <Spinner />
                {PHASE_LABEL[status.phase]}
                {status.phase === "upload" && status.progress ? ` ${Math.round(status.progress)}%` : "…"}
              </>
            ) : (
              "Upload"
            )}
          </button>
        </div>
      )}
      {status.phase === "upload" && (
        <div className="h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(status.progress ?? 0)}>
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${status.progress ?? 0}%` }} />
        </div>
      )}
      {status.error && <p className="text-sm text-red-600">{status.error}</p>}
      {status.message && <p className="text-sm text-ok">{status.message}</p>}
    </form>
  );
}

