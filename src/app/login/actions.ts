"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import type { ActionResult } from "@/lib/result-types";

const loginSchema = z.object({
  password: z.string().min(1).max(200),
  // Only same-site paths, never "//evil.com".
  next: z
    .string()
    .regex(/^\/(?!\/)/)
    .catch("/"),
});

export async function loginAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const input = loginSchema.safeParse({ password: form.get("password"), next: form.get("next") });
  if (!input.success || !(await signIn(input.data.password))) return { error: "Wrong password" };
  redirect(input.data.next);
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}
