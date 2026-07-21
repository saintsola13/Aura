"use client";
import { Avatar, SocialShell } from "@/components/site-chrome";
import { api } from "@/lib/api";
import type { PaginatedResponse, PublicUserProfile } from "@aura/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
export function UserListPage({
  username,
  direction,
}: {
  username: string;
  direction: "followers" | "following";
}) {
  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api<PaginatedResponse<PublicUserProfile>>(
      `/v1/profiles/${username}/${direction}`,
    )
      .then((r) => setUsers(r.data))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load."),
      );
  }, [username, direction]);
  return (
    <SocialShell>
      <header className="border-b border-white/[.07] px-5 py-4">
        <h1 className="font-medium capitalize">{direction}</h1>
        <p className="text-xs text-zinc-600">@{username}</p>
      </header>
      {error ? (
        <p className="p-10 text-center text-sm text-red-300">{error}</p>
      ) : !users.length ? (
        <p className="p-12 text-center text-sm text-zinc-600">
          No {direction} yet.
        </p>
      ) : (
        users.map((user) => (
          <Link
            href={`/profile/${user.username}`}
            key={user.id}
            className="flex gap-3 border-b border-white/[.07] p-5 hover:bg-white/[.02]"
          >
            <Avatar user={user} />
            <span>
              <span className="block text-sm font-medium">
                {user.displayName}
              </span>
              <span className="text-xs text-zinc-600">@{user.username}</span>
              <span className="mt-1 line-clamp-1 text-xs text-zinc-500">
                {user.bio}
              </span>
            </span>
          </Link>
        ))
      )}
    </SocialShell>
  );
}
