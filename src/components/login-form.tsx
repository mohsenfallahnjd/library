"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";
import { idle } from "@/lib/result-types";
import { Spinner } from "./spinner";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, idle);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      {/* Username field helps password managers remember the entry. */}
      <input type="text" name="username" value="library" autoComplete="username" readOnly hidden />
      <input
        type="password"
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        aria-label="Password"
        className="input"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} aria-busy={pending} className="btn-primary w-full py-2.5">
        {pending ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
      </button>
    </form>
  );
}
