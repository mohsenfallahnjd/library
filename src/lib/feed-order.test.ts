import { describe, expect, it } from "vitest";
import { groupByDay, sortNewest } from "./feed-order";

const NOW = new Date(2026, 10, 4, 12);
const at = (daysAgo: number, hour: number) => new Date(2026, 10, 4 - daysAgo, hour);

describe("sortNewest", () => {
  it("orders by time across the date formats sources use", () => {
    // String order would put the "-05:00" story first; it is the middle one in time.
    const stories = [
      { id: "lobsters", createdAt: "2026-11-04T09:00:00.000-05:00" }, // 14:00 UTC
      { id: "devto", createdAt: "2026-11-04T15:00:00Z" },
      { id: "hn", createdAt: "2026-11-04T10:30:00.000Z" },
    ];
    expect(sortNewest(stories).map((s) => s.id)).toEqual(["devto", "lobsters", "hn"]);
  });

  it("does not change the list it was given", () => {
    const stories = [{ createdAt: at(1, 9).toISOString() }, { createdAt: at(0, 9).toISOString() }];
    const copy = [...stories];
    sortNewest(stories);
    expect(stories).toEqual(copy);
  });
});

describe("groupByDay", () => {
  it("labels recent days", () => {
    const stories = [at(0, 9), at(1, 9), at(2, 9), at(9, 9)].map((d) => ({ createdAt: d.toISOString() }));
    expect(groupByDay(stories, NOW).map((g) => g.label)).toEqual(["Today", "Yesterday", "Monday", "Oct 26"]);
  });

  it("keeps each day once even when the input is out of order", () => {
    const stories = [at(0, 9), at(1, 9), at(0, 8), at(1, 8)].map((d) => ({ createdAt: d.toISOString() }));
    const groups = groupByDay(stories, NOW);
    expect(groups.map((g) => [g.label, g.stories.length])).toEqual([
      ["Today", 2],
      ["Yesterday", 2],
    ]);
  });
});
