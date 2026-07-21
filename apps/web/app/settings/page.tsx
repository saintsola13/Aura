import { WalletAddress } from "@/components/wallet-address";
import { SocialShell } from "@/components/site-chrome";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings — AURA",
  description: "Manage your locally saved public wallet address and AURA resources.",
};

export default function SettingsPage() {
  return (
    <SocialShell>
      <div className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[.22em] text-violet-300">Preferences</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-.045em] sm:text-5xl">Settings</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">
          Manage the public address stored on this device and review AURA product information.
        </p>

        <section className="mt-12 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.025]" aria-labelledby="identity-heading">
          <div className="flex flex-col gap-5 border-b border-white/[.07] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="identity-heading" className="font-medium">Public wallet address</h2>
              <p className="mt-1 text-sm text-zinc-500">Saved only in this browser. No wallet connection is made.</p>
            </div>
            <WalletAddress />
          </div>

          <Link
            href="/white-paper"
            className="group flex items-center gap-4 p-6 transition hover:bg-white/[.035]"
            aria-label="WP — AURA White Paper"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/[.08] text-xs font-semibold tracking-[.12em] text-violet-200">WP</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">AURA White Paper</span>
              <span className="mt-1 block text-sm text-zinc-500">Product scope, principles, limitations, risks, and roadmap.</span>
            </span>
            <span className="text-zinc-600 transition group-hover:translate-x-1 group-hover:text-zinc-300" aria-hidden="true">→</span>
          </Link>
        </section>

        <aside className="mt-6 rounded-2xl border border-white/[.07] p-5 text-xs leading-5 text-zinc-600">
          AURA accepts public addresses for profile lookup only. It does not verify control of an address, connect to wallet software, or enable transactions.
        </aside>
      </div>
    </SocialShell>
  );
}
