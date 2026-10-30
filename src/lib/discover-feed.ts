import "server-only";
import { cacheLife } from "next/cache";
import { fetchSuggestions } from "./discover";

/**
 * The live feed for a topic list. Cached for a few minutes so a busy
 * morning of refreshing doesn't hammer HN, Lobsters and dev.to.
 */
export async function getFeed(topics: string[]) {
  "use cache";
  cacheLife("minutes");
  return { suggestions: await fetchSuggestions(topics), fetchedAt: new Date().toISOString() };
}
