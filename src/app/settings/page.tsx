import type { Metadata } from "next";
import { Suspense } from "react";
import { Bookmarklet } from "@/components/bookmarklet";
import { TopicsForm } from "@/components/topics-form";
import { getStackTopics } from "@/lib/stack";
import { logoutAction } from "../login/actions";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section id="stack" className="space-y-2">
        <h2 className="font-semibold">Your stack</h2>
        <p className="text-sm text-muted">
          Topics used to pick stories for the feed and to auto-tag new items. Comma separated.
        </p>
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg border border-line bg-surface" />}>
          <Topics />
        </Suspense>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">Save from your iPhone</h2>
        <p className="text-muted">An iOS Shortcut in Safari’s share sheet saves the page you’re on.</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-muted">
          <li>Shortcuts → New shortcut → turn on “Show in Share Sheet”, accept URLs and Safari web pages.</li>
          <li>
            Add <b className="text-ink">Get URLs from Input</b> (Safari shares a page, not a link).
          </li>
          <li>
            Add <b className="text-ink">Get Contents of URL</b>: <code className="font-mono">POST</code>{" "}
            <code className="font-mono break-all">/api/items</code> on this site, header{" "}
            <code className="font-mono break-all">Authorization: Bearer &lt;LIBRARY_API_TOKEN&gt;</code>, JSON body{" "}
            <code className="font-mono">url</code> = <i>URLs</i>.
          </li>
          <li>Optionally “Show Notification” with the returned title.</li>
        </ol>
        <p className="text-muted">Then: Safari → Share → your shortcut. Full steps are in the README.</p>
      </section>

      {/* Bookmarklets only make sense with a bookmarks bar. */}
      <section className="hidden space-y-2 sm:block">
        <h2 className="font-semibold">Quick save on the Mac</h2>
        <p className="text-sm text-muted">
          Drag this to your bookmarks bar. On any page, click it to save that page.
        </p>
        <Bookmarklet />
      </section>

      <form action={logoutAction}>
        <button type="submit" className="btn-ghost">
          Sign out
        </button>
      </form>
    </div>
  );
}

async function Topics() {
  return <TopicsForm topics={await getStackTopics()} />;
}
