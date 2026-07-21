"use client";
import { useSession } from "@/components/social/session-provider";
import { loginDestination } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { account, loading } = useSession();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !account) router.replace(loginDestination(path));
  }, [account, loading, path, router]);
  if (loading || !account)
    return (
      <main className="grid min-h-screen place-items-center text-sm text-zinc-500">
        Checking your secure session…
      </main>
    );
  if (
    (account.status === "suspended" || account.status === "pending_deletion") &&
    path === "/settings/account"
  )
    return children;
  if (account.status === "suspended")
    return (
      <main className="mx-auto max-w-xl px-6 py-32">
        <h1 className="text-3xl">Account suspended</h1>
        <p className="mt-4 text-zinc-400">
          Content changes are unavailable. You can review account information
          and contact support to appeal.
        </p>
      </main>
    );
  if (account.status === "pending_deletion")
    return (
      <main className="mx-auto max-w-xl px-6 py-32">
        <h1 className="text-3xl">Account pending deletion</h1>
        <p className="mt-4 text-zinc-400">
          Social activity is paused during the deletion grace period. Visit
          Account settings to cancel deletion.
        </p>
      </main>
    );
  return children;
}
