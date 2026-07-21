"use client";
export const dynamic = "force-dynamic";
import { Turnstile } from "@/components/turnstile";
import { API_URL, api } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
function LoginContent() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect")?.startsWith("/")
    ? params.get("redirect")!
    : "/home";
  const xEnabled = process.env.NEXT_PUBLIC_X_AUTH_ENABLED === "true";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        data: { message: string; maskedEmail: string };
      }>("/v1/auth/email/request", {
        method: "POST",
        body: JSON.stringify({
          email,
          turnstileToken: token,
          redirectPath: redirect,
        }),
      });
      sessionStorage.setItem("aura.login.email", email);
      sessionStorage.setItem("aura.login.masked", result.data.maskedEmail);
      router.push(`/auth/email/check?redirect=${encodeURIComponent(redirect)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-16">
      <div className="subtle-glow" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/[.09] bg-[#0b0b0e]/90 p-7 shadow-2xl sm:p-10">
        <Link href="/" className="mb-10 flex items-center gap-3">
          <span className="logo-mark" />
          <span className="text-xs font-semibold tracking-[.22em]">AURA</span>
        </Link>
        <h1 className="text-3xl font-medium tracking-[-.04em]">
          Welcome to AURA
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          A secure account for your place in NFT culture.
        </p>
        {xEnabled ? (
          <a
            href={`${API_URL}/v1/auth/x/start?redirect=${encodeURIComponent(redirect)}`}
            className="mt-8 flex h-12 items-center justify-center rounded-full bg-white font-medium text-black"
          >
            Continue with X
          </a>
        ) : (
          <div
            className="mt-8 flex h-12 items-center justify-center rounded-full border border-white/[.08] text-sm text-zinc-600"
            aria-disabled="true"
          >
            Continue with X · unavailable in preview
          </div>
        )}
        <div className="my-7 flex items-center gap-3 text-xs text-zinc-700">
          <span className="h-px flex-1 bg-white/[.08]" />
          or
          <span className="h-px flex-1 bg-white/[.08]" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs text-zinc-400">
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-white/[.1] bg-white/[.04] px-4 text-base outline-none focus:border-violet-400/60"
              placeholder="you@example.com"
            />
          </label>
          <Turnstile action="email_login" onToken={setToken} />
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            disabled={busy || !token}
            className="h-12 w-full rounded-full border border-white/[.12] bg-white/[.06] text-sm disabled:opacity-40"
          >
            {busy ? "Sending secure link…" : "Continue with email"}
          </button>
        </form>
        <p className="mt-7 text-xs leading-5 text-zinc-600">
          By continuing, you agree to the{" "}
          <Link className="text-zinc-400" href="/terms">
            Terms
          </Link>{" "}
          and acknowledge the{" "}
          <Link className="text-zinc-400" href="/privacy">
            Privacy Policy
          </Link>
          . AURA never uses a wallet address to sign you in.
        </p>
      </section>
    </main>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-zinc-500">
          Loading secure sign-in…
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
