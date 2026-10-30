import { randomBytes } from "node:crypto";

const alphabet = "0123456789abcdefghijkmnopqrstuvwxyz";

/** URL-safe random id. 10 chars ≈ 51 bits. */
export function newId(size = 10) {
  const bytes = randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
