"use client";
import { AuthGate } from "@/components/auth-gate";
import { SocialShell } from "@/components/site-chrome";
import { Turnstile } from "@/components/turnstile";
import { API_URL, api, relativeTime } from "@/lib/api";
import { useSession } from "@/components/social/session-provider";
import { FormEvent, useEffect, useState } from "react";
type DeviceSession = {
  id: string;
  created_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  user_agent_summary: string | null;
  current: boolean;
};
function AccountSettings() {
  const { account, identities, refresh, signOut } = useSession();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [email, setEmail] = useState("");
  const [turnstile, setTurnstile] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const load = () =>
    api<{ data: DeviceSession[] }>("/v1/auth/sessions")
      .then((r) => setSessions(r.data))
      .catch(() => setSessions([]));
  useEffect(() => {
    void load();
  }, []);
  async function changeEmail(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const r = await api<{ data: { message: string } }>(
        "/v1/auth/email/change/request",
        {
          method: "POST",
          body: JSON.stringify({ email, turnstileToken: turnstile }),
        },
      );
      setMessage(r.data.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to request change.");
    }
  }
  async function revoke(id: string) {
    await api(`/v1/auth/sessions/${id}`, { method: "DELETE" });
    load();
  }
  const x = identities.find((i) => i.provider === "x");
  return (
    <SocialShell>
      <header className="border-b border-white/[.07] px-6 py-5">
        <p className="text-xs uppercase tracking-[.2em] text-violet-300">
          Security
        </p>
        <h1 className="mt-2 text-2xl">Account settings</h1>
      </header>
      <div className="space-y-10 p-6">
        {account?.status === "pending_deletion" && (
          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-5">
            <h2 className="text-lg">Deletion is scheduled</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Cancel during the 30-day grace period to restore social activity.
            </p>
            <button
              onClick={() =>
                api("/v1/account/delete/cancel", { method: "POST" })
                  .then(() => {
                    refresh();
                    location.reload();
                  })
                  .catch((e) => setMessage(e.message))
              }
              className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm text-black"
            >
              Cancel account deletion
            </button>
          </section>
        )}
        <section>
          <h2 className="text-lg">Sign-in methods</h2>
          <div className="mt-4 space-y-3 rounded-2xl border border-white/[.08] p-5">
            <div className="flex justify-between gap-4">
              <span>
                <span className="block text-sm">Verified email</span>
                <span className="text-xs text-zinc-500">
                  {account?.primaryEmail ?? "Not added"}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm">X</span>
                <span className="text-xs text-zinc-500">
                  {x ? `Connected as @${x.username}` : "Not connected"}
                </span>
              </span>
              {x ? (
                <button
                  onClick={() =>
                    api("/v1/auth/x/link", { method: "DELETE" })
                      .then(refresh)
                      .catch((e) => setMessage(e.message))
                  }
                  className="text-xs text-red-300"
                >
                  Disconnect X
                </button>
              ) : (
                <a
                  href={`${API_URL}/v1/auth/x/link/start?redirect=/settings/account`}
                  className="rounded-full border border-white/[.1] px-4 py-2 text-xs"
                >
                  Connect as a sign-in method
                </a>
              )}
            </div>
          </div>
          <form onSubmit={changeEmail} className="mt-5 space-y-3">
            <label className="text-xs text-zinc-400">
              Add or change verified email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-white/[.1] bg-white/[.04] px-4"
              />
            </label>
            <Turnstile action="email_change" onToken={setTurnstile} />
            <button
              disabled={!turnstile}
              className="rounded-full bg-white px-5 py-2.5 text-sm text-black disabled:opacity-40"
            >
              Send verification link
            </button>
          </form>
        </section>
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Active sessions</h2>
            <button
              onClick={() =>
                api("/v1/auth/logout-all", { method: "POST" })
                  .then(() => location.assign("/login"))
                  .catch((e) => setMessage(e.message))
              }
              className="text-xs text-red-300"
            >
              Sign out all
            </button>
          </div>
          <div className="mt-4 divide-y divide-white/[.07] rounded-2xl border border-white/[.08]">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-5 p-4"
              >
                <span>
                  <span className="block text-sm">
                    {s.user_agent_summary ?? "Unknown browser"}{" "}
                    {s.current && (
                      <em className="ml-2 not-italic text-violet-300">
                        Current
                      </em>
                    )}
                  </span>
                  <span className="text-xs text-zinc-600">
                    Last active {relativeTime(s.last_seen_at)} · Created{" "}
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </span>
                <button
                  onClick={() => revoke(s.id)}
                  className="text-xs text-zinc-400"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => void signOut().then(() => location.assign("/"))}
            className="mt-4 text-sm text-zinc-400"
          >
            Sign out this session
          </button>
        </section>
        <section className="rounded-2xl border border-red-300/15 bg-red-400/[.03] p-5">
          <h2 className="text-lg">Delete account</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            A 30-day cancellation window applies. This deletes or anonymizes
            AURA data; it cannot delete public blockchain data outside AURA.
          </p>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type DELETE AURA ACCOUNT"
            className="mt-4 h-11 w-full rounded-xl border border-white/[.1] bg-black/20 px-4 text-sm"
          />
          <button
            onClick={() =>
              api("/v1/account/delete/request", {
                method: "POST",
                body: JSON.stringify({ confirmation }),
              })
                .then(() => location.assign("/"))
                .catch((e) => setMessage(e.message))
            }
            disabled={confirmation !== "DELETE AURA ACCOUNT"}
            className="mt-3 rounded-full bg-red-200 px-5 py-2.5 text-sm text-red-950 disabled:opacity-30"
          >
            Schedule deletion
          </button>
        </section>
        {message && (
          <p role="status" className="text-sm text-violet-200">
            {message}
          </p>
        )}
        <p className="text-xs text-zinc-600">
          Account export is not yet automated. Contact support to request an
          export.
        </p>
      </div>
    </SocialShell>
  );
}
export default function AccountPage() {
  return (
    <AuthGate>
      <AccountSettings />
    </AuthGate>
  );
}
