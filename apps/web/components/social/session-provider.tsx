"use client";

import { api, getDevUserId, setDevUserId } from "@/lib/api";
import type { PublicUserProfile } from "@aura/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type SessionState = { users: PublicUserProfile[]; user: PublicUserProfile | null; loading: boolean; selectUser: (id: string) => void; refresh: () => void };
const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    api<{ data: PublicUserProfile[] }>("/v1/dev/users").then(({ data }) => {
      setUsers(data);
      const stored = getDevUserId();
      const next = data.some((user) => user.id === stored) ? stored : data[0]?.id ?? "";
      if (next && next !== stored) setDevUserId(next);
      setSelected(next);
    }).catch(() => setUsers([])).finally(() => setLoading(false));
  }, [revision]);

  useEffect(() => {
    const sync = () => setSelected(getDevUserId());
    window.addEventListener("aura:dev-user-change", sync);
    return () => window.removeEventListener("aura:dev-user-change", sync);
  }, []);

  const value = useMemo(() => ({ users, user: users.find((item) => item.id === selected) ?? null, loading, selectUser: setDevUserId, refresh: () => setRevision((value) => value + 1) }), [users, selected, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
