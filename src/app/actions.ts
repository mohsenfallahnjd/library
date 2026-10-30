"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import type { SourceId } from "@/lib/discover";
import { addItem, deleteItem, updateItem, type Status } from "@/lib/items";
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
  redirect("/");
}

export async function deleteItemAction(id: string): Promise<void> {
  await requireSession();
  await deleteItem(id);
  redirect("/");
}

export async function saveSuggestionAction(input: { url: string; title: string; source: SourceId }): Promise<ActionResult> {
  await requireSession();
  try {
    const { item, created } = await addItem({ kind: "article", ...input });
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
