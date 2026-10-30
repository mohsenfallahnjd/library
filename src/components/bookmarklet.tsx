"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useRef } from "react";

/** React refuses javascript: hrefs, so the link is filled in after mount. */
export function Bookmarklet() {
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const save = `${location.origin}/save`;
    const code = `javascript:(()=>{window.open('${save}?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'library','width=480,height=600')})()`;
    link.current?.setAttribute("href", code);
  }, []);

  return (
    <a
      ref={link}
      href="#"
      onClick={(e) => e.preventDefault()}
      className="btn-ghost cursor-grab border-dashed font-mono"
      title="Drag me to your bookmarks bar"
    >
      <Bookmark size={14} /> + library
    </a>
  );
}
