"use client";

import { api } from "@/lib/api";
import type { PublicUserProfile } from "@aura/shared";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthAccount = {
  id: string;
  primaryEmail: string | null;
  status: "active" | "suspended" | "disabled" | "pending_deletion";
  role: "user" | "moderator" | "admin";
  createdAt: string;
  deletionScheduledFor: string | null;
};
export type AuthIdentity = {
  id: string;
  provider: "email" | "x";
  username: string | null;
  email: string | null;
  verified: boolean;
};
type SessionPayload = {
  data: null | {
    account: AuthAccount;
    identities: AuthIdentity[];
    profile: {
      id: string;
      username: string;
      display_name: string;
      avatar_key: string | null;
    } | null;
    session: { id: string; idleExpiresAt: string; absoluteExpiresAt: string };
  };
};
type SessionState = {
  account: AuthAccount | null;
  identities: AuthIdentity[];
  user: PublicUserProfile | null;
  session: SessionPayload["data"] extends infer _T
    ? { id: string; idleExpiresAt: string; absoluteExpiresAt: string } | null
    : never;
  loading: boolean;
  refresh: () => void;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<SessionPayload["data"]>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api<SessionPayload>("/v1/auth/session")
      .then((result) => {
        if (active) setPayload(result.data);
      })
      .catch(() => {
        if (active) setPayload(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const user = payload?.profile
    ? ({
        id: payload.profile.id,
        username: payload.profile.username,
        displayName: payload.profile.display_name,
        bio: null,
        avatarUrl: payload.profile.avatar_key
          ? `/v1/media/${payload.profile.avatar_key}`
          : null,
        bannerUrl: null,
        location: null,
        websiteUrl: null,
        manuallyEnteredWalletAddress: null,
        isVerified: false,
        createdAt: payload.account.createdAt,
        updatedAt: payload.account.createdAt,
      } satisfies PublicUserProfile)
    : null;
  const value = useMemo<SessionState>(
    () => ({
      account: payload?.account ?? null,
      identities: payload?.identities ?? [],
      user,
      session: payload?.session ?? null,
      loading,
      refresh: () => setRevision((v) => v + 1),
      signOut: async () => {
        await api("/v1/auth/logout", { method: "POST" });
        setPayload(null);
      },
    }),
    [payload, user, loading],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
