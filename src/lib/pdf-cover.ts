import type { PDFDocumentProxy } from "pdfjs-dist";

const COVER_WIDTH = 240;

/** Loads pdf.js in the browser with its worker. */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

/** Renders page 1 as a small JPEG and saves it as the book's cover. Best effort. */
export async function uploadCover(itemId: string, doc: PDFDocumentProxy) {
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return;
    await fetch(`/api/items/${itemId}/cover`, { method: "POST", body: blob, headers: { "content-type": "image/jpeg" } });
  } catch {
    // The card falls back to a coloured spine; nothing to tell the user.
  }
}

/** Opens a local PDF file and makes its cover (used right after upload). */
export async function uploadCoverFromFile(itemId: string, file: File) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    await uploadCover(itemId, await task.promise);
  } finally {
    await task.destroy();
  }
}
