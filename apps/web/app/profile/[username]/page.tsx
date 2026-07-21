"use client";
import { Avatar, SocialShell } from "@/components/site-chrome";
import { Composer } from "@/components/social/composer";
import { FeedList } from "@/components/social/feed-list";
import { api, mediaSrc } from "@/lib/api";
import type { PublicUserProfile } from "@aura/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
type ProfileData = {
  profile: PublicUserProfile;
  followerCount: number;
  followingCount: number;
  postCount: number;
  currentUserFollows: boolean;
  isCurrentUser: boolean;
};
export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"posts" | "replies" | "media">("posts");
  const [rev, setRev] = useState(0);
  useEffect(() => {
    api<{ data: ProfileData }>(`/v1/profiles/${username}`)
      .then((r) => setData(r.data))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Profile unavailable."),
      );
  }, [username, rev]);
  async function follow() {
    if (!data) return;
    await api(`/v1/profiles/${username}/follow`, {
      method: data.currentUserFollows ? "DELETE" : "POST",
    });
    setRev((v) => v + 1);
  }
  if (error)
    return (
      <SocialShell>
        <p className="p-16 text-center text-sm text-red-300">{error}</p>
      </SocialShell>
    );
  if (!data)
    return (
      <SocialShell>
        <div className="h-96 animate-pulse bg-white/[.02]" />
      </SocialShell>
    );
  const p = data.profile;
  return (
    <SocialShell>
      <div className="relative h-44 bg-gradient-to-br from-violet-950/70 via-zinc-900 to-fuchsia-950/40 sm:h-52">
        {p.bannerUrl && (
          <img
            src={mediaSrc(p.bannerUrl) ?? ""}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <section className="relative px-5 pb-5">
        <div className="-mt-12 flex items-end justify-between">
          <div className="rounded-full border-4 border-[#070708]">
            <Avatar user={p} size="lg" />
          </div>
          {data.isCurrentUser ? (
            <Link
              href="/profile/edit"
              className="mb-1 rounded-full border border-white/15 px-5 py-2 text-sm hover:bg-white/[.05]"
            >
              Edit profile
            </Link>
          ) : (
            <button
              onClick={follow}
              className={`mb-1 rounded-full px-5 py-2 text-sm font-medium ${data.currentUserFollows ? "border border-white/15" : "bg-white text-black"}`}
            >
              {data.currentUserFollows ? "Following" : "Follow"}
            </button>
          )}
        </div>
        <h1 className="mt-4 text-xl font-semibold">
          {p.displayName}
          {p.isVerified && <span className="ml-1 text-violet-300">◆</span>}
        </h1>
        <p className="text-sm text-zinc-600">@{p.username}</p>
        {p.bio && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
            {p.bio}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600">
          {p.location && <span>⌖ {p.location}</span>}
          {p.websiteUrl && (
            <a
              href={p.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-violet-300"
            >
              ↗ {new URL(p.websiteUrl).hostname}
            </a>
          )}
          <span>
            Joined{" "}
            {new Intl.DateTimeFormat("en", {
              month: "long",
              year: "numeric",
            }).format(new Date(p.createdAt))}
          </span>
        </div>
        {p.manuallyEnteredWalletAddress && (
          <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <code className="truncate text-xs text-zinc-400">
                {p.manuallyEnteredWalletAddress}
              </code>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(p.manuallyEnteredWalletAddress!)
                }
                className="shrink-0 text-xs text-zinc-500 hover:text-white"
              >
                Copy address
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-amber-200/50">
              Manually entered public reference. Wallet ownership is not
              verified.
            </p>
          </div>
        )}
        <div className="mt-4 flex gap-5 text-sm">
          <Link href={`/followers/${p.username}`}>
            <b>{data.followerCount}</b>{" "}
            <span className="text-zinc-600">followers</span>
          </Link>
          <Link href={`/following/${p.username}`}>
            <b>{data.followingCount}</b>{" "}
            <span className="text-zinc-600">following</span>
          </Link>
          <span>
            <b>{data.postCount}</b> <span className="text-zinc-600">posts</span>
          </span>
        </div>
      </section>
      {data.isCurrentUser && (
        <Composer compact onPosted={() => setRev((v) => v + 1)} />
      )}
      <div className="grid grid-cols-3 border-b border-t border-white/[.07]">
        {(["posts", "replies", "media"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`py-4 text-xs capitalize ${tab === item ? "border-b-2 border-violet-400 text-white" : "text-zinc-600"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <FeedList
        endpoint={`/v1/profiles/${username}/posts${tab === "posts" ? "" : `?tab=${tab}`}`}
        revision={rev}
        empty={`No ${tab} yet.`}
      />
    </SocialShell>
  );
}
