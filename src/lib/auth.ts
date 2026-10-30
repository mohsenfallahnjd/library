import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionToken, SESSION_COOKIE, verifySessionToken } from "./session";

/** Second check next to the data, in case the proxy matcher ever misses a path. */
export async function requireSession() {
  if (!verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/login");
}

export async function signIn(password: string) {
  if (!checkPassword(password)) {
    // Slow down guessing a little.
    await new Promise((r) => setTimeout(r, 600));
    return false;
  }
  const { token, expiresAt } = createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return true;
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
}
