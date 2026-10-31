import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { NavLink } from "@/components/nav-link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Library", template: "%s · Library" },
  description: "A personal tech reading library: PDFs, articles and sites in one place.",
  appleWebApp: { capable: true, title: "Library", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-mono font-semibold tracking-tight">
              <span className="text-accent">~/</span>library
            </Link>
            <div className="ml-auto hidden items-center gap-4 text-muted sm:flex">
              <NavLink href="/">Feed</NavLink>
              <NavLink href="/books">Books</NavLink>
              <NavLink href="/library">Library</NavLink>
              <NavLink href="/settings">Settings</NavLink>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-8">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
