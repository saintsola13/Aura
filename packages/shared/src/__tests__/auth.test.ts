import { describe, expect, it } from "vitest";
import {
  AUTH_TIMING,
  canLoginForStatus,
  canMutateForStatus,
  canUnlinkIdentity,
  constantTimeEqual,
  createPkce,
  generateSecureToken,
  hashWithPepper,
  isEmail,
  isOneTimeTokenUsable,
  isSessionExpired,
  maskEmail,
  matchesImageSignature,
  normalizeEmail,
  ownsResource,
  privateRateLimitKey,
  safeRedirect,
  sessionExpiration,
  shouldRollSession,
  validateMutationOrigin,
} from "../auth";

describe("authentication primitives", () => {
  it("generates opaque tokens with at least 256 bits", () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(() => generateSecureToken(16)).toThrow();
  });
  it("hashes tokens deterministically with a pepper", async () => {
    expect(await hashWithPepper("token", "pepper")).toBe(
      await hashWithPepper("token", "pepper"),
    );
    expect(await hashWithPepper("token", "one")).not.toBe(
      await hashWithPepper("token", "two"),
    );
  });
  it("compares secrets without early length equality", () => {
    expect(constantTimeEqual("same", "same")).toBe(true);
    expect(constantTimeEqual("same", "different")).toBe(false);
  });
  it("generates valid PKCE pairs", async () => {
    const value = await createPkce();
    expect(value.verifier.length).toBeGreaterThan(60);
    expect(value.challenge).not.toBe(value.verifier);
  });
});

describe("session timing", () => {
  const now = new Date("2026-07-20T00:00:00Z");
  it("creates idle and absolute bounds", () => {
    const x = sessionExpiration(now);
    expect(x.idleExpiresAt.getTime() - now.getTime()).toBe(
      AUTH_TIMING.sessionIdleMs,
    );
    expect(x.absoluteExpiresAt.getTime() - now.getTime()).toBe(
      AUTH_TIMING.sessionAbsoluteMs,
    );
  });
  it("expires on either boundary", () => {
    expect(isSessionExpired("2026-07-19", "2026-08-01", now)).toBe(true);
    expect(isSessionExpired("2026-07-30", "2026-08-20", now)).toBe(false);
  });
  it("rolls after one day", () =>
    expect(shouldRollSession("2026-07-18", now)).toBe(true));
  it("enforces one-time magic-link expiration and consumption", () => {
    expect(isOneTimeTokenUsable("2026-07-20T00:10:00Z", null, now)).toBe(true);
    expect(
      isOneTimeTokenUsable("2026-07-20T00:10:00Z", "2026-07-19", now),
    ).toBe(false);
    expect(isOneTimeTokenUsable("2026-07-19", null, now)).toBe(false);
  });
});

describe("input and policy security", () => {
  it("normalizes and validates email", () => {
    expect(normalizeEmail(" Test@Example.COM ")).toBe("test@example.com");
    expect(isEmail("test@example.com")).toBe(true);
    expect(isEmail("broken")).toBe(false);
    expect(maskEmail("tester@example.com")).not.toContain("tester@");
  });
  it("allows only internal redirects", () => {
    expect(safeRedirect("/post/1?x=1")).toBe("/post/1?x=1");
    expect(safeRedirect("https://evil.test")).toBe("/home");
    expect(safeRedirect("//evil.test")).toBe("/home");
    expect(safeRedirect("/\\evil")).toBe("/home");
  });
  it("validates CSRF origins", () => {
    expect(
      validateMutationOrigin("https://aura.example", "https://aura.example"),
    ).toBe(true);
    expect(
      validateMutationOrigin("https://evil.example", "https://aura.example"),
    ).toBe(false);
    expect(validateMutationOrigin(null, "https://aura.example")).toBe(false);
  });
  it("enforces account status", () => {
    expect(canMutateForStatus("active")).toBe(true);
    expect(canMutateForStatus("suspended")).toBe(false);
    expect(canLoginForStatus("disabled")).toBe(false);
  });
  it("prevents unlinking the final method", () => {
    expect(canUnlinkIdentity(1)).toBe(false);
    expect(canUnlinkIdentity(2)).toBe(true);
  });
  it("checks ownership by profile identity", () => {
    expect(ownsResource("usr_a", "usr_a")).toBe(true);
    expect(ownsResource("usr_a", "usr_b")).toBe(false);
  });
  it("uses private rate-limit keys", async () => {
    const key = await privateRateLimitKey(
      "email",
      "Person@Example.com",
      "pepper",
    );
    expect(key).not.toContain("person@example.com");
  });
  it("checks image magic bytes", () => {
    expect(
      matchesImageSignature(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg"),
    ).toBe(true);
    expect(matchesImageSignature(new Uint8Array([1, 2, 3]), "image/jpeg")).toBe(
      false,
    );
  });
});
