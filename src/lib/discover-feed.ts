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
  // Fetch more than a screenful: stories you mark read make room for the next ones.
  return { suggestions: await fetchSuggestions(topics, { limit: 200 }), fetchedAt: new Date().toISOString() };
}
