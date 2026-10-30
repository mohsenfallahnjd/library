import { createHash, timingSafeEqual } from "node:crypto";

const sha = (s: string) => createHash("sha256").update(s).digest();

/** True when the request carries `Authorization: Bearer <LIBRARY_API_TOKEN>`. */
export function hasApiToken(request: Request) {
  const expected = process.env.LIBRARY_API_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return Boolean(token) && timingSafeEqual(sha(token!), sha(expected));
}
