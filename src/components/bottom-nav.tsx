"use client";

import { clsx } from "clsx";
import { BookMarked, Library, Newspaper, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { href: "/", label: "Home", icon: Newspaper },
  { href: "/books", label: "Books", icon: BookMarked },
  { href: "/library", label: "Library", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** Phone navigation at thumb height. Hidden while reading and on the login page. */
function Tabs() {
  const pathname = usePathname();
  if (pathname.startsWith("/read/") || pathname === "/login") return null;
  return <Bar active={(href) => (href === "/" ? pathname === "/" : pathname.startsWith(href))} />;
}

function Bar({ active }: { active: (href: string) => boolean }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
                  on ? "font-medium text-accent" : "text-muted active:text-ink",
                )}
              >
                <Icon size={21} strokeWidth={on ? 2.2 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={<Bar active={() => false} />}>
      <Tabs />
    </Suspense>
  );
}
