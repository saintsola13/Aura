"use client";
export const dynamic = "force-dynamic";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
function ConfirmEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [purpose, setPurpose] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setToken(params.get("token") ?? "");
    setPurpose(params.get("purpose") ?? "login");
    history.replaceState(null, "", "/auth/email/confirm");
  }, [params]);
  async function consume() {
    setBusy(true);
    setError("");
    try {
      if (purpose === "email_change") {
        await api("/v1/auth/email/change/confirm", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        router.replace("/settings/account");
      } else {
        const result = await api<{ data: { redirectPath: string } }>(
          "/v1/auth/email/consume",
          { method: "POST", body: JSON.stringify({ token }) },
        );
        router.replace(result.data.redirectPath);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This link is invalid or expired.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="w-full max-w-md rounded-[2rem] border border-white/[.09] p-8 text-center">
        <span className="logo-mark mx-auto block" />
        <h1 className="mt-8 text-3xl">Confirm sign-in</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          For your security, opening the email did not sign you in. Continue
          only if you requested this link.
        </p>
        {error && (
          <p role="alert" className="mt-5 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          onClick={consume}
          disabled={!token || busy}
          className="mt-8 h-12 w-full rounded-full bg-white text-sm font-medium text-black disabled:opacity-40"
        >
          {busy
            ? "Confirming…"
            : purpose === "email_change"
              ? "Confirm email change"
              : "Continue to AURA"}
        </button>
        {(!token || error) && (
          <Link href="/login" className="mt-5 block text-sm text-violet-300">
            Request another link
          </Link>
        )}
      </section>
    </main>
  );
}
export default function ConfirmEmailPage(){return <Suspense fallback={<main className="grid min-h-screen place-items-center text-zinc-500">Loading confirmation…</main>}><ConfirmEmailContent/></Suspense>}
