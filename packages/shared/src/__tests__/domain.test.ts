import { describe, expect, it } from "vitest";
import {
  applyIdempotentLike,
  canFollow,
  isEthereumAddress,
  isUsername,
  mapFeedPost,
  parseMentions,
  validatePost,
  validateProfile,
  type FeedRowLike,
} from "../index";

describe("username validation", () => {
  it("accepts normalized usernames and blocks malformed or reserved names", () => {
    expect(isUsername("mira_pixels")).toBe(true);
    expect(isUsername("MiRa")).toBe(false);
    expect(isUsername("ab")).toBe(false);
    expect(isUsername("settings")).toBe(false);
  });
});

describe("wallet-address validation", () => {
  it("accepts only 0x plus 40 hex characters", () => {
    expect(
      isEthereumAddress("0x1111111111111111111111111111111111111111"),
    ).toBe(true);
    expect(isEthereumAddress("0xnot-an-address")).toBe(false);
  });
});

describe("post and profile validation", () => {
  it("rejects empty and oversized posts while allowing repost-only posts", () => {
    expect(validatePost({ body: "" })).toHaveProperty("body");
    expect(validatePost({ repostOfPostId: "post_1" })).toEqual({});
    expect(validatePost({ body: "x".repeat(501) })).toHaveProperty("body");
  });
  it("validates the complete editable profile", () => {
    expect(
      validateProfile({
        username: "novaforms",
        displayName: "Nova",
        websiteUrl: "https://example.com",
      }),
    ).toEqual({});
    expect(
      validateProfile({
        username: "Admin",
        displayName: "",
        websiteUrl: "http://example.com",
      }),
    ).toEqual(
      expect.objectContaining({
        username: expect.any(String),
        displayName: expect.any(String),
        websiteUrl: expect.any(String),
      }),
    );
  });
});

describe("social rules", () => {
  it("prevents self-following", () =>
    expect(canFollow("user_a", "user_a")).toBe(false));
  it("permits following another user", () =>
    expect(canFollow("user_a", "user_b")).toBe(true));
  it("applies likes idempotently", () => {
    const result = applyIdempotentLike(new Set(["user_a"]), "user_a");
    expect([...result]).toEqual(["user_a"]);
  });
});

describe("mention parsing", () => {
  it("deduplicates valid lowercase mentions and ignores reserved names", () => {
    expect(
      parseMentions("hi @novaforms and @novaforms, cc @settings @UPPER"),
    ).toEqual(["novaforms"]);
  });
});

describe("feed mapping", () => {
  it("maps D1 integer flags to booleans", () => {
    const row = {
      currentUserLiked: 1,
      currentUserFollowsAuthor: 0,
    } as FeedRowLike;
    const mapped = mapFeedPost(row);
    expect(mapped.currentUserLiked).toBe(true);
    expect(mapped.currentUserFollowsAuthor).toBe(false);
  });
});
