import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkPassword, createSessionToken, verifySessionToken } from "./session";

const env = { ...process.env };

beforeEach(() => {
  process.env.LIBRARY_PASSWORD = "correct horse";
  process.env.AUTH_SECRET = "s3cret";
});
afterEach(() => {
  process.env = { ...env };
});

describe("session tokens", () => {
  it("verifies its own tokens", () => {
    expect(verifySessionToken(createSessionToken().token)).toBe(true);
  });

  it("rejects expired, tampered and malformed tokens", () => {
    const { token } = createSessionToken(Date.now() - 100 * 86_400_000);
    expect(verifySessionToken(token)).toBe(false);
    const good = createSessionToken().token;
    const [v, exp, mac] = good.split(".");
    expect(verifySessionToken(`${v}.${Number(exp) + 1}.${mac}`)).toBe(false);
    expect(verifySessionToken("garbage")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });

  it("revokes tokens when the password changes", () => {
    const { token } = createSessionToken();
    process.env.LIBRARY_PASSWORD = "new password";
    expect(verifySessionToken(token)).toBe(false);
  });

  it("fails closed when no password is configured", () => {
    const { token } = createSessionToken();
    delete process.env.LIBRARY_PASSWORD;
    expect(verifySessionToken(token)).toBe(false);
    expect(checkPassword("")).toBe(false);
  });

  it("checks the password", () => {
    expect(checkPassword("correct horse")).toBe(true);
    expect(checkPassword("correct horse ")).toBe(false);
  });
});
