"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { attachPdfAction } from "@/app/actions";
import { uploadCoverFromFile } from "@/lib/pdf-cover";
import { uploadPdf } from "@/lib/upload-pdf";
import { Spinner } from "./spinner";
import { PHASE_LABEL, type Phase } from "./upload-book-form";

/** Adds (or replaces) the PDF of a book that is already in the library. */
export function AttachPdf({ id, hasFile, hasCover, direct }: { id: string; hasFile: boolean; hasCover: boolean; direct: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function attach(file: File) {
    setError(null);
    setPhase("upload");
    try {
      const fileKey = await uploadPdf(file, direct, setProgress);
      setPhase("save");
      const result = await attachPdfAction(id, fileKey);
      if (result.error) throw new Error(result.error);
      if (!hasCover) {
        setPhase("cover");
        await uploadCoverFromFile(id, file);
      }
      router.push(`/read/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setPhase(null);
    }
  }

  return (
    <section id="pdf" className="space-y-2 rounded-xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">PDF</h2>
      <p className="text-sm text-muted">
        {hasFile ? "Replace the PDF of this book. Your reading position starts over." : "Got the book? Add its PDF to read it here."}
      </p>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted hover:border-accent has-disabled:cursor-default has-disabled:opacity-60">
        {phase ? <Spinner size={18} /> : <FileUp size={18} aria-hidden />}
        <span className="flex-1">
          {phase ? `${PHASE_LABEL[phase]}${phase === "upload" && progress ? ` ${Math.round(progress)}%` : "…"}` : hasFile ? "Choose a new PDF…" : "Choose the PDF…"}
        </span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={Boolean(phase)}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) void attach(file);
          }}
        />
      </label>
      {phase === "upload" && (
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
