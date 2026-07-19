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
  teamEmpty: boolean;
  loading: boolean;
  /** The session has a verified TOTP factor (the user has set up MFA). */
  mfaEnrolled: boolean;
  /** MFA was completed this session — the JWT is at aal2. */
  mfaSatisfied: boolean;
  refresh: () => Promise<void>;
  /** Re-read the current authenticator assurance level after enroll/challenge. */
  refreshMfa: () => Promise<void>;
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
  const [teamEmpty, setTeamEmpty] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [mfaEnrolled, setMfaEnrolled] = React.useState(false);
  const [mfaSatisfied, setMfaSatisfied] = React.useState(false);

  const loadRole = React.useCallback(async (s: Session | null) => {
    if (!s) {
      setRole(null);
      setTeamEmpty(false);
      return;
    }
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      const data = await res.json();
      setRole(data.role ?? null);
      setTeamEmpty(!!data.teamEmpty);
    } catch {
      setRole(null);
    }
  }, []);

  const loadMfa = React.useCallback(async (s: Session | null) => {
    if (!s) {
      setMfaEnrolled(false);
      setMfaSatisfied(false);
      return;
    }
    // nextLevel === "aal2" means a verified factor exists (enrolled);
    // currentLevel === "aal2" means this session already passed the challenge.
    const { data } = await supabase().auth.mfa.getAuthenticatorAssuranceLevel();
    setMfaEnrolled(data?.nextLevel === "aal2");
    setMfaSatisfied(data?.currentLevel === "aal2");
  }, []);

  React.useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await Promise.all([loadRole(data.session), loadMfa(data.session)]);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await Promise.all([loadRole(s), loadMfa(s)]);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadRole, loadMfa]);

  const refresh = React.useCallback(async () => {
    const { data } = await supabase().auth.getSession();
    setSession(data.session);
    await Promise.all([loadRole(data.session), loadMfa(data.session)]);
  }, [loadRole, loadMfa]);

  const refreshMfa = React.useCallback(async () => {
    const { data } = await supabase().auth.getSession();
    await loadMfa(data.session);
  }, [loadMfa]);

  const signOut = React.useCallback(async () => {
    await supabase().auth.signOut();
    setSession(null);
    setRole(null);
    setMfaEnrolled(false);
    setMfaSatisfied(false);
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
    session, role, teamEmpty, loading, mfaEnrolled, mfaSatisfied,
    refresh, refreshMfa, signOut, authFetch,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
