import "server-only";
import { cacheLife } from "next/cache";
import { fetchSuggestions } from "./discover";

/** Suggestions for a topic list, cached for an hour so the sources aren't hammered. */
export async function getSuggestions(topics: string[]) {
  "use cache";
  cacheLife("hours");
  return fetchSuggestions(topics);
}
