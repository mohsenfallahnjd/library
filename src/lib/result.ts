import { ItemError } from "./items";
import type { ActionResult } from "./result-types";

export type { ActionResult };

/** Turns expected errors into a message for the form; rethrows the rest. */
export function toResult(err: unknown): ActionResult {
  if (err instanceof ItemError) return { error: err.message };
  throw err;
}
