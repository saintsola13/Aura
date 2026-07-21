"use client";
import { Avatar, SocialShell } from "@/components/site-chrome";
import { AuthGate } from "@/components/auth-gate";
import { api, mediaSrc } from "@/lib/api";
import {
  LIMITS,
  validateProfile,
  type PublicUserProfile,
  type UpdateProfileInput,
} from "@aura/shared";
import { useSession } from "@/components/social/session-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function EditProfilePage() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [form, setForm] = useState<UpdateProfileInput>({
    username: "",
    displayName: "",
    bio: "",
    location: "",
    websiteUrl: "",
    manuallyEnteredWalletAddress: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (user)
      api<{ data: { profile: PublicUserProfile } }>(
        `/v1/profiles/${user.username}`,
      ).then((r) => {
        const p = r.data.profile;
        setProfile(p);
        setForm({
          username: p.username,
          displayName: p.displayName,
          bio: p.bio ?? "",
          location: p.location ?? "",
          websiteUrl: p.websiteUrl ?? "",
          manuallyEnteredWalletAddress: p.manuallyEnteredWalletAddress ?? "",
        });
      });
  }, [user]);
  const field = (key: keyof UpdateProfileInput, value: string) => {
    setForm((v) => ({ ...v, [key]: value }));
    setErrors((v) => ({ ...v, [key]: "" }));
  };
  async function save() {
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setPending(true);
    try {
      const r = await api<{ data: PublicUserProfile }>("/v1/me/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setProfile(r.data);
      refresh();
      setMessage("Profile saved.");
      setTimeout(() => router.push(`/profile/${r.data.username}`), 500);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }
  async function upload(kind: "avatar" | "banner", file?: File) {
    if (!file) return;
    setMessage("Uploading…");
    try {
      await api(`/v1/me/${kind}`, {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      refresh();
      if (user) {
        const r = await api<{ data: { profile: PublicUserProfile } }>(
          `/v1/profiles/${user.username}`,
        );
        setProfile(r.data.profile);
      }
      setMessage("Image updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    }
  }
  async function remove(kind: "avatar" | "banner") {
    await api(`/v1/me/${kind}`, { method: "DELETE" });
    setProfile((p) =>
      p ? { ...p, [kind === "avatar" ? "avatarUrl" : "bannerUrl"]: null } : p,
    );
    setMessage("Image removed.");
  }
  const Input = ({
    name,
    label,
    max,
    type = "text",
  }: {
    name: keyof UpdateProfileInput;
    label: string;
    max?: number;
    type?: string;
  }) => (
    <label className="block">
      <span className="mb-2 flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        {max && (
          <span>
            {String(form[name] ?? "").length}/{max}
          </span>
        )}
      </span>
      <input
        type={type}
        value={String(form[name] ?? "")}
        maxLength={max}
        onChange={(e) => field(name, e.target.value)}
        className="h-11 w-full rounded-xl border border-white/[.08] bg-white/[.03] px-4 text-sm outline-none focus:border-violet-400/50"
      />
      {errors[name] && (
        <span className="mt-1 block text-xs text-red-300">{errors[name]}</span>
      )}
    </label>
  );
  return (
    <AuthGate>
      <SocialShell>
        <header className="border-b border-white/[.07] px-5 py-4">
          <h1 className="font-medium">Edit profile</h1>
        </header>
        <div className="space-y-7 p-5 sm:p-7">
          <section>
            <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 to-zinc-900">
              {profile?.bannerUrl && (
                <img
                  src={mediaSrc(profile.bannerUrl) ?? ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <label className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-black/70 px-3 py-2 text-xs">
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => upload("banner", e.target.files?.[0])}
                />
                Change banner
              </label>
              {profile?.bannerUrl && (
                <button
                  onClick={() => remove("banner")}
                  className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-2 text-xs"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="-mt-10 ml-4 flex items-end gap-3">
              <div className="rounded-full border-4 border-[#070708]">
                {profile && <Avatar user={profile} size="lg" />}
              </div>
              <label className="mb-2 cursor-pointer text-xs text-violet-300">
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => upload("avatar", e.target.files?.[0])}
                />
                Change avatar
              </label>
              {profile?.avatarUrl && (
                <button
                  onClick={() => remove("avatar")}
                  className="mb-2 text-xs text-zinc-600"
                >
                  Remove
                </button>
              )}
            </div>
          </section>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input name="username" label="Username" max={LIMITS.usernameMax} />
            <Input
              name="displayName"
              label="Display name"
              max={LIMITS.displayNameMax}
            />
          </div>
          <label className="block">
            <span className="mb-2 flex justify-between text-xs text-zinc-400">
              <span>Bio</span>
              <span>
                {form.bio?.length ?? 0}/{LIMITS.bioMax}
              </span>
            </span>
            <textarea
              value={form.bio ?? ""}
              maxLength={LIMITS.bioMax}
              onChange={(e) => field("bio", e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-white/[.08] bg-white/[.03] p-4 text-sm outline-none focus:border-violet-400/50"
            />
          </label>
          <Input name="location" label="Location" max={80} />
          <Input name="websiteUrl" label="Website (HTTPS)" type="url" />
          <Input
            name="manuallyEnteredWalletAddress"
            label="Public wallet address"
          />
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-4 text-xs leading-5 text-amber-100/60">
            AURA stores this as a public profile reference only. AURA does not
            verify ownership, connect to wallets, request signatures, or
            initiate transactions.
          </div>
          {message && (
            <p className="text-sm text-zinc-400" role="status">
              {message}
            </p>
          )}
          <button
            onClick={save}
            disabled={pending}
            className="h-11 w-full rounded-full bg-white text-sm font-medium text-black disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </SocialShell>
    </AuthGate>
  );
}
