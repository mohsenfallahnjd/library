import type { Metadata } from "next";
import { Bookmarklet } from "@/components/bookmarklet";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-semibold">Quick save</h2>
        <p className="text-sm text-muted">
          Drag this to your bookmarks bar. On any page, click it to save that page.
        </p>
        <Bookmarklet />
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-semibold">iOS Shortcut</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Shortcuts → New shortcut → turn on “Show in Share Sheet”, accept URLs and Safari web pages.</li>
          <li>
            Add <b className="text-ink">Get Contents of URL</b>: <code className="font-mono">POST</code> to{" "}
            <code className="font-mono">/api/items</code> on this site.
          </li>
          <li>
            Header <code className="font-mono">Authorization: Bearer &lt;LIBRARY_API_TOKEN&gt;</code>, JSON body{" "}
            <code className="font-mono">url</code> = Shortcut Input.
          </li>
          <li>Optionally add “Show Notification” with the returned title.</li>
        </ol>
        <p className="text-muted">Full steps are in the README.</p>
      </section>
    </div>
  );
}
