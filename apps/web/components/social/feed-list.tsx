"use client";

import { api } from "@/lib/api";
import type { FeedPost, PaginatedResponse } from "@aura/shared";
import { useCallback, useEffect, useState } from "react";
import { PostCard } from "./post-card";
import { useSession } from "./session-provider";

export function FeedSkeleton() {
  return (
    <div className="animate-pulse space-y-px">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 border-b border-white/[.07] p-5">
          <div className="h-11 w-11 rounded-full bg-white/[.06]" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-36 rounded bg-white/[.06]" />
            <div className="h-3 w-full rounded bg-white/[.04]" />
            <div className="h-3 w-2/3 rounded bg-white/[.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedList({
  endpoint,
  revision = 0,
  empty = "Nothing here yet.",
}: {
  endpoint: string;
  revision?: number;
  empty?: string;
}) {
  const { user } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
      setError("");
      try {
        const join = endpoint.includes("?") ? "&" : "?";
        const result = await api<PaginatedResponse<FeedPost>>(
          `${endpoint}${!reset && cursor ? `${join}cursor=${cursor}` : ""}`,
        );
        setPosts((old) => (reset ? result.data : [...old, ...result.data]));
        setCursor(result.nextCursor);
        setMore(Boolean(result.nextCursor));
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to load posts.",
        );
      } finally {
        setLoading(false);
      }
    },
    [endpoint, cursor],
  );
  useEffect(() => {
    void load(true);
  }, [endpoint, revision, user?.id]);
  if (loading && !posts.length) return <FeedSkeleton />;
  if (error && !posts.length)
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <button
          onClick={() => load(true)}
          className="mt-4 text-xs text-zinc-500"
        >
          Try again
        </button>
      </div>
    );
  if (!posts.length)
    return (
      <div className="p-14 text-center text-sm text-zinc-600">{empty}</div>
    );
  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDeleted={(id) => setPosts((v) => v.filter((p) => p.id !== id))}
          onChanged={() => load(true)}
        />
      ))}
      {more && (
        <button
          onClick={() => load(false)}
          disabled={loading}
          className="w-full p-5 text-sm text-zinc-500 hover:text-white"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
