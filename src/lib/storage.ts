import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, put } from "@vercel/blob";
import { contentTypeOf, isValidKey, makeFileKey } from "./file-key";
import { newId } from "./id";

/**
 * File storage for PDFs and their cover images. Uses private Vercel Blob when BLOB_READ_WRITE_TOKEN is
 * set, otherwise the local ./uploads folder. Callers only see opaque keys;
 * files are served back through /api/files/[...key], behind auth.
 */

export type StoredFile = { body: ReadableStream<Uint8Array>; contentType: string; size: number | null };

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const usesBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const newFileKey = (filename: string) => makeFileKey(filename, newId());

export { isValidKey };

export async function saveFile(key: string, data: Blob): Promise<string> {
  if (!isValidKey(key)) throw new Error("Invalid file key");
  if (usesBlob()) {
    const blob = await put(key, data, {
      access: "private",
      contentType: contentTypeOf(key),
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.pathname;
  }
  if (process.env.VERCEL) {
    // The deployed file system is read-only; local storage is for development.
    throw new Error("Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to upload files");
  }
  const file = path.join(UPLOAD_DIR, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await data.arrayBuffer()));
  return key;
}

export async function readFile(key: string): Promise<StoredFile | null> {
  if (!isValidKey(key)) return null;
  if (usesBlob()) {
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob.contentType, size: res.blob.size };
  }
  const file = path.join(UPLOAD_DIR, key);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return null;
  return {
    body: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>,
    contentType: contentTypeOf(key),
    size: info.size,
  };
}

export async function removeFile(key: string) {
  if (!isValidKey(key)) return;
  if (usesBlob()) {
    await del(key).catch(() => {});
    return;
  }
  await rm(path.join(UPLOAD_DIR, key), { force: true });
}
