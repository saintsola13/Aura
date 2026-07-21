"use client";
import { SocialShell } from "@/components/site-chrome";
import { Composer } from "@/components/social/composer";
import { FeedList } from "@/components/social/feed-list";
import { AuthGate } from "@/components/auth-gate";
import { useState } from "react";
export default function HomePage() {
  const [r, setR] = useState(0);
  return (
    <AuthGate>
      <SocialShell
        aside={
          <div className="rounded-2xl border border-white/[.07] p-5">
            <p className="text-sm font-medium">Your following feed</p>
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Chronological posts from people you follow, plus your own. No
              engagement ranking.
            </p>
          </div>
        }
      >
        <header className="sticky top-16 z-20 border-b border-white/[.07] bg-[#070708]/85 px-5 py-4 backdrop-blur-xl lg:top-0">
          <h1 className="font-medium">Home</h1>
        </header>
        <Composer compact onPosted={() => setR((v) => v + 1)} />
        <FeedList
          endpoint="/v1/feed"
          revision={r}
          empty="Follow a few people or share the first post in your feed."
        />
      </SocialShell>
    </AuthGate>
  );
}
