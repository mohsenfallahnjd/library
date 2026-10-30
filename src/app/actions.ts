"use server";

import { refresh } from "next/cache";
import { addItem } from "@/lib/items";
import { toResult, type ActionResult } from "@/lib/result";

export async function addLinkAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const { item, created } = await addItem({
      kind: form.get("kind") === "site" ? "site" : "article",
      url: String(form.get("url") ?? ""),
      title: String(form.get("title") ?? ""),
      tags: String(form.get("tags") ?? ""),
    });
    refresh();
    return { ok: true, id: item.id, message: created ? `Saved “${item.title}”` : "Already in your library" };
  } catch (err) {
    return toResult(err);
  }
}
