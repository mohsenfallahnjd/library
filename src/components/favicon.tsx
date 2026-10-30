"use client";

import { useState } from "react";

/** Site icon via DuckDuckGo's icon service, falling back to the first letter. */
export function Favicon({ host }: { host: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="font-mono text-base font-semibold uppercase text-muted">{host.charAt(0)}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny third-party icon, no optimisation needed
    <img
      src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onLoad={(e) => e.currentTarget.naturalWidth <= 1 && setFailed(true)}
      className="size-5"
    />
  );
}
