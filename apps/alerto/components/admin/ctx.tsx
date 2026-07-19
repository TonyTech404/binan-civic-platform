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
  /** May approve/reject pending alerts (owner or granted can_approve). */
  canApprove: boolean;
  /** Assigned barangay id, or null = city-wide. Scoped members see/send only this. */
  barangayId: string | null;
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
  const [canApprove, setCanApprove] = React.useState(false);
  const [barangayId, setBarangayId] = React.useState<string | null>(null);
  const [teamEmpty, setTeamEmpty] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [mfaEnrolled, setMfaEnrolled] = React.useState(false);
  const [mfaSatisfied, setMfaSatisfied] = React.useState(false);

  const loadRole = React.useCallback(async (s: Session | null) => {
    if (!s) {
      setRole(null);
      setCanApprove(false);
      setBarangayId(null);
      setTeamEmpty(false);
      return;
    }
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      const data = await res.json();
      setRole(data.role ?? null);
      setCanApprove(!!data.canApprove);
      setBarangayId(data.barangayId ?? null);
      setTeamEmpty(!!data.teamEmpty);
    } catch {
      setRole(null);
      setCanApprove(false);
    }
  }, []);

  const loadMfa = React.useCallback(async (s: Session | null) => {
    if (!s) {
      setMfaEnrolled(false);
      setMfaSatisfied(false);
      return;
    }
    try {
      // nextLevel === "aal2" means a verified factor exists (enrolled);
      // currentLevel === "aal2" means this session already passed the challenge.
      const { data, error } = await supabase().auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) return; // transient — keep current MFA state, don't downgrade
      setMfaEnrolled(data.nextLevel === "aal2");
      setMfaSatisfied(data.currentLevel === "aal2");
    } catch {
      // Never reject: a thrown MFA check must not brick the whole admin's loading.
    }
  }, []);

  React.useEffect(() => {
    const sb = supabase();
    let active = true;

    // Initial load. try/finally guarantees `loading` always clears — a thrown
    // loadRole/loadMfa must never leave the whole admin stuck on the spinner.
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (!active) return;
        setSession(data.session);
        await Promise.all([loadRole(data.session), loadMfa(data.session)]);
      } catch (e) {
        console.error("admin init failed:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // Do NOT call Supabase auth methods (getSession / mfa.*) synchronously in
      // this callback: it runs while the auth client holds its lock, and those
      // methods wait on the same lock → deadlock (endless loading, e.g. after a
      // token refresh during a long broadcast). Defer the work off the lock.
      setTimeout(() => {
        if (!active) return;
        Promise.all([loadRole(s), loadMfa(s)]).catch((e) => console.error("auth refresh failed:", e));
      }, 0);
    });

    // Failsafe: never leave the admin on the spinner forever.
    const failsafe = setTimeout(() => { if (active) setLoading(false); }, 12000);

    return () => { active = false; clearTimeout(failsafe); sub.subscription.unsubscribe(); };
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
    setCanApprove(false);
    setBarangayId(null);
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
    session, role, canApprove, barangayId, teamEmpty, loading, mfaEnrolled, mfaSatisfied,
    refresh, refreshMfa, signOut, authFetch,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
