/** Feed ordering. Sources format dates differently, so always compare real times. */

type Dated = { createdAt: string };

export function sortNewest<T extends Dated>(stories: T[]): T[] {
  return [...stories].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(date: Date, days: number) {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en", { weekday: "long" });
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Today / Yesterday / Wednesday / Oct 21, in the reader's own time zone; each day appears once. */
export function groupByDay<T extends Dated>(stories: T[], now = new Date()) {
  const today = startOfDay(now);
  const groups = new Map<string, { label: string; stories: T[] }>();
  for (const story of stories) {
    const date = new Date(story.createdAt);
    const label = dayLabel(date, Math.round((today - startOfDay(date)) / 86_400_000));
    const group = groups.get(label);
    if (group) group.stories.push(story);
    else groups.set(label, { label, stories: [story] });
  }
  return [...groups.values()];
}
