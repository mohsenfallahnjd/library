"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import type { SourceId } from "@/lib/discover";
import { BOOKS } from "@/lib/books";
import { getBookLinks } from "@/lib/books-links";
import { addItem, attachFile, deleteItem, setCover, updateItem, type Status } from "@/lib/items";
import { mark, unmark } from "@/lib/marks-db";
import { setStackTopics } from "@/lib/stack";
import { toResult, type ActionResult } from "@/lib/result";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function addLinkAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireSession();
  try {
    const { item, created } = await addItem({
      kind: form.get("kind") === "site" ? "site" : "article",
      url: text(form, "url"),
      title: text(form, "title"),
      tags: text(form, "tags"),
    });
    refresh();
    return { ok: true, id: item.id, message: created ? `Saved “${item.title}”` : "Already in your library" };
  } catch (err) {
    return toResult(err);
  }
}

export async function addBookAction(input: {
  fileKey: string;
  title: string;
  tags?: string;
}): Promise<ActionResult> {
  await requireSession();
  try {
    const { item } = await addItem({ kind: "book", ...input, tags: input.tags ?? "" });
    refresh();
    return { ok: true, id: item.id, message: `Added “${item.title}”` };
  } catch (err) {
    return toResult(err);
  }
}

export async function setStatusAction(id: string, status: Status): Promise<ActionResult> {
  await requireSession();
  try {
    await updateItem(id, { status });
    refresh();
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function saveItemAction(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  await requireSession();
  try {
    await updateItem(id, {
      kind: text(form, "kind") as never,
      title: text(form, "title"),
      url: form.has("url") ? text(form, "url") || null : undefined,
      author: text(form, "author"),
      tags: text(form, "tags"),
      status: text(form, "status") as never,
      notes: text(form, "notes"),
    });
  } catch (err) {
    return toResult(err);
  }
  redirect("/library");
}

export async function deleteItemAction(id: string): Promise<void> {
  await requireSession();
  await deleteItem(id);
  redirect("/library");
}

export async function saveSuggestionAction(input: { url: string; title: string; source: SourceId }): Promise<ActionResult> {
  await requireSession();
  try {
    const { item, created } = await addItem({ kind: "article", ...input });
    refresh();
    return { ok: true, id: item.id, message: created ? "Saved" : "Already saved" };
  } catch (err) {
    return toResult(err);
  }
}

export async function saveTopicsAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireSession();
  const topics = await setStackTopics(text(form, "topics")).catch(() => null);
  if (!topics) return { error: "Up to 40 topics, 40 characters each" };
  refresh();
  return { ok: true, message: `Saved ${topics.length} topics` };
}

/** Feed: hide stories as read (or not interesting); synced across devices. */
export async function markStoriesAction(
  state: "read" | "hidden",
  entries: { key: string; title?: string | null }[],
): Promise<ActionResult> {
  await requireSession();
  try {
    await mark(state, entries);
    return { ok: true };
  } catch {
    return { error: "Could not save that, try again" };
  }
}

export async function unmarkStoriesAction(keys: string[]): Promise<ActionResult> {
  await requireSession();
  await unmark(keys.slice(0, 500));
  return { ok: true };
}

/** Books page: add a suggested book to the library as "to read", with its cover. */
export async function wantBookAction(bookId: string): Promise<ActionResult> {
  await requireSession();
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) return { error: "Unknown book" };
  try {
    const links = await getBookLinks(book.id);
    const { item, created } = await addItem({
      kind: "book",
      title: book.title,
      author: book.author,
      url: links?.pageUrl ?? null,
      tags: book.topics.filter((t) => t !== "craft"),
      notes: book.why,
      source: "books",
    });
    if (created && links?.coverUrl) {
      const res = await fetch(links.coverUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null);
      if (res?.ok) await setCover(item.id, new Blob([await res.arrayBuffer()], { type: "image/jpeg" })).catch(() => {});
    }
    refresh();
    return { ok: true, id: item.id, message: created ? "Added to your library" : "Already in your library" };
  } catch (err) {
    return toResult(err);
  }
}

export async function dismissBookAction(bookId: string, undo = false): Promise<ActionResult> {
  await requireSession();
  if (!BOOKS.some((b) => b.id === bookId)) return { error: "Unknown book" };
  if (undo) await unmark([`book:${bookId}`]);
  else await mark("hidden", [{ key: `book:${bookId}` }]);
  return { ok: true };
}

/** Attaches a PDF (already uploaded to storage) to an existing book. */
export async function attachPdfAction(id: string, fileKey: string): Promise<ActionResult> {
  await requireSession();
  try {
    const item = await attachFile(id, fileKey);
    refresh();
    return { ok: true, id: item.id, message: "PDF attached" };
  } catch (err) {
    return toResult(err);
  }
}
