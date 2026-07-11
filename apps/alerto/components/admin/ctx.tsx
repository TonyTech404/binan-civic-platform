"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase";
import type { Role } from "@/lib/rbac";

// Single browser Supabase client for the whole admin app (preserves session).
let _client: ReturnType<typeof createBrowserClient> | null = null;
export function supabase() {
  if (!_client) _client = createBrowserClient();
  return _client;
}

type AdminState = {
  session: Session | null;
  role: Role | null;
  /** Assigned barangay id, or null for city-wide staff. */
  barangayId: string | null;
  barangayName: string | null;
  teamEmpty: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** fetch() with the caller's bearer token attached. */
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const Ctx = React.createContext<AdminState | null>(null);

export function useAdmin(): AdminState {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used within <AdminProvider>");
  return v;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [role, setRole] = React.useState<Role | null>(null);
  const [barangayId, setBarangayId] = React.useState<string | null>(null);
  const [barangayName, setBarangayName] = React.useState<string | null>(null);
  const [teamEmpty, setTeamEmpty] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const loadRole = React.useCallback(async (s: Session | null) => {
    if (!s) {
      setRole(null);
      setBarangayId(null);
      setBarangayName(null);
      setTeamEmpty(false);
      return;
    }
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      const data = await res.json();
      setRole(data.role ?? null);
      setBarangayId(data.barangayId ?? null);
      setBarangayName(data.barangayName ?? null);
      setTeamEmpty(!!data.teamEmpty);
    } catch {
      setRole(null);
    }
  }, []);

  React.useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadRole(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadRole(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadRole]);

  const refresh = React.useCallback(async () => {
    const { data } = await supabase().auth.getSession();
    setSession(data.session);
    await loadRole(data.session);
  }, [loadRole]);

  const signOut = React.useCallback(async () => {
    await supabase().auth.signOut();
    setSession(null);
    setRole(null);
  }, []);

  const authFetch = React.useCallback(
    async (input: string, init: RequestInit = {}) => {
      const { data } = await supabase().auth.getSession();
      const token = data.session?.access_token;
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(input, { ...init, headers });
    },
    [],
  );

  const value: AdminState = {
    session, role, barangayId, barangayName, teamEmpty, loading, refresh, signOut, authFetch,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
