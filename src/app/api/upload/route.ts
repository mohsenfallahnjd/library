import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { isValidKey, newFileKey, saveFile, usesBlob } from "@/lib/storage";

const MAX_BYTES = 200 * 1024 * 1024;

/**
 * Two upload paths behind one URL:
 * - Vercel Blob: the browser uploads straight to Blob (no 4.5 MB function
 *   limit); this route only hands out a client token for a valid key.
 * - Local disk: the browser posts multipart form data and we write ./uploads.
 */
export async function POST(request: NextRequest) {
  if (usesBlob()) {
    const body = (await request.json()) as HandleUploadBody;
    try {
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          if (!isValidKey(pathname)) throw new Error("Invalid file key");
          return {
            allowedContentTypes: ["application/pdf"],
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: false,
          };
        },
      });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large" }, { status: 413 });
  try {
    const key = await saveFile(newFileKey(file.name), file);
    return NextResponse.json({ key });
  } catch (err) {
    // e.g. deployed without a Blob store: say so instead of a bare 500.
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}
