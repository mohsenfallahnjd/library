import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Single-user sessions without a sessions table: the cookie holds
 * "v1.<expiresAtMs>.<hmac>" signed with AUTH_SECRET (or LIBRARY_PASSWORD).
 * Changing the password or secret signs every device out.
 * No "server-only" here: src/proxy.ts uses it too.
 */

export const SESSION_COOKIE = "library_session";
export const SESSION_DAYS = 90;

function secret() {
  const s = process.env.AUTH_SECRET || process.env.LIBRARY_PASSWORD;
  if (!s) throw new Error("Set LIBRARY_PASSWORD (and optionally AUTH_SECRET)");
  // Bind the key to the password so changing it revokes old cookies.
  return `${s}:${process.env.LIBRARY_PASSWORD ?? ""}`;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

const sameText = (a: string, b: string) => {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
};

export function createSessionToken(now = Date.now()) {
  const expiresAt = now + SESSION_DAYS * 86_400_000;
  const payload = `v1.${expiresAt}`;
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(expiresAt) };
}

export function verifySessionToken(token: string | undefined, now = Date.now()) {
  if (!token || !isConfigured()) return false;
  const [version, expires, mac] = token.split(".");
  if (version !== "v1" || !expires || !mac || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < now) return false;
  return sameText(mac, sign(`${version}.${expires}`));
}

export function checkPassword(input: string) {
  const expected = process.env.LIBRARY_PASSWORD;
  return Boolean(expected) && sameText(input, expected!);
}

export const isConfigured = () => Boolean(process.env.LIBRARY_PASSWORD);
