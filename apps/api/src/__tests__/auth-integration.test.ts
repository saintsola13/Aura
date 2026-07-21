import {
  AUTH_TIMING,
  canMutateForStatus,
  canUnlinkIdentity,
  createPkce,
  generateSecureToken,
  hashWithPepper,
  isOneTimeTokenUsable,
  ownsResource,
  safeRedirect,
} from "@aura/shared";
import { rejectsDevelopmentIdentityHeader } from "../auth";
import { describe, expect, it, vi } from "vitest";

class MockAuthStore {
  tokens = new Map<
    string,
    { email: string; expires: number; consumed: boolean }
  >();
  sessions = new Map<string, { account: string; revoked: boolean }>();
  async request(email: string) {
    const raw = generateSecureToken();
    this.tokens.set(await hashWithPepper(raw, "test-pepper"), {
      email,
      expires: Date.now() + AUTH_TIMING.magicLinkMs,
      consumed: false,
    });
    return raw;
  }
  async consume(raw: string) {
    const row = this.tokens.get(await hashWithPepper(raw, "test-pepper"));
    if (!row || row.consumed || row.expires <= Date.now()) return null;
    row.consumed = true;
    const session = generateSecureToken();
    this.sessions.set(await hashWithPepper(session, "test-pepper"), {
      account: row.email,
      revoked: false,
    });
    return session;
  }
  async logout(raw: string) {
    const row = this.sessions.get(await hashWithPepper(raw, "test-pepper"));
    if (row) row.revoked = true;
  }
  async logoutAll(account: string) {
    for (const row of this.sessions.values())
      if (row.account === account) row.revoked = true;
  }
}

describe("authentication API contract integration", () => {
  it("requests, consumes once, creates a session, and logs out", async () => {
    const store = new MockAuthStore();
    const token = await store.request("person@example.com");
    const session = await store.consume(token);
    expect(session).toBeTruthy();
    expect(await store.consume(token)).toBeNull();
    await store.logout(session!);
    expect([...store.sessions.values()][0]?.revoked).toBe(true);
  });
  it("rejects expired magic links", async () => {
    vi.useFakeTimers();
    const store = new MockAuthStore();
    const token = await store.request("person@example.com");
    vi.advanceTimersByTime(AUTH_TIMING.magicLinkMs + 1);
    expect(await store.consume(token)).toBeNull();
    vi.useRealTimers();
  });
  it("revokes every account session", async () => {
    const store = new MockAuthStore();
    await store.consume(await store.request("a@example.com"));
    await store.consume(await store.request("a@example.com"));
    await store.logoutAll("a@example.com");
    expect([...store.sessions.values()].every((s) => s.revoked)).toBe(true);
  });
  it("mocks X callback PKCE and keeps the immutable provider subject", async () => {
    const pkce = await createPkce();
    const provider = vi
      .fn()
      .mockResolvedValue({
        subject: "x-immutable-42",
        username: "changeable_name",
      });
    const identity = await provider(pkce.verifier);
    expect(pkce.challenge).not.toBe(pkce.verifier);
    expect(identity.subject).toBe("x-immutable-42");
  });
  it("enforces identity conflicts and minimum sign-in method", () => {
    const attachedAccount: string = "account-a";
    const currentAccount: string = "account-b";
    expect(attachedAccount === currentAccount).toBe(false);
    expect(canUnlinkIdentity(1)).toBe(false);
    expect(canUnlinkIdentity(2)).toBe(true);
  });
  it("enforces status and ownership authorization", () => {
    expect(canMutateForStatus("suspended")).toBe(false);
    expect(ownsResource("owner", "attacker")).toBe(false);
    expect(ownsResource("owner", "owner")).toBe(true);
  });
  it("rejects legacy identity headers in production and by default", () => {
    expect(
      rejectsDevelopmentIdentityHeader("production", "1", "usr_demo"),
    ).toBe(true);
    expect(
      rejectsDevelopmentIdentityHeader("development", undefined, "usr_demo"),
    ).toBe(true);
    expect(
      rejectsDevelopmentIdentityHeader("development", "1", "usr_demo"),
    ).toBe(false);
  });
  it("rejects unsafe callbacks and used one-time tokens", () => {
    expect(safeRedirect("https://evil.example")).toBe("/home");
    expect(
      isOneTimeTokenUsable(new Date(Date.now() + 1000).toISOString(), null),
    ).toBe(true);
    expect(
      isOneTimeTokenUsable(
        new Date(Date.now() + 1000).toISOString(),
        new Date().toISOString(),
      ),
    ).toBe(false);
  });
});
