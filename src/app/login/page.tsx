import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { isConfigured } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-xs space-y-4 pt-16">
      <h1 className="text-center font-mono text-lg font-semibold">
        <span className="text-accent">~/</span>library
      </h1>
      {isConfigured() ? (
        <Suspense fallback={null}>
          <Next searchParams={searchParams} />
        </Suspense>
      ) : (
        <p className="rounded-lg border border-line bg-surface p-3 text-sm text-muted">
          Set <code className="font-mono text-ink">LIBRARY_PASSWORD</code> in the environment to enable sign-in.
        </p>
      )}
    </div>
  );
}

async function Next({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : "/"} />;
}
