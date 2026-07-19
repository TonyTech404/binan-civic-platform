import { NextRequest } from "next/server";
import { createServiceClient, createTokenClient } from "@/lib/supabase";
import { type Role, type Permission, can } from "@/lib/rbac";

export type Caller = {
  userId: string;
  email: string;
  role: Role;
  /**
   * Authenticator Assurance Level from the caller's JWT. "aal2" means the
   * caller completed multi-factor authentication this session; "aal1" means
   * password only.
   */
  aal: string | null;
};

function bearer(req: NextRequest): string {
  const header = req.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/**
 * Read the `aal` claim from a Supabase access token. Safe to decode without
 * re-verifying: callers only trust this after getUser() has already validated
 * the same token's signature and expiry.
 */
export function aalFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const json = JSON.parse(atob(b64)) as { aal?: string };
    return json.aal ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve the staff member behind an admin API request.
 *
 * The browser sends its Supabase access token as `Authorization: Bearer …`.
 * We verify it (getUser), then look up the caller's role in alerto_admins with
 * the service client. Returns null if unauthenticated or not a team member.
 */
export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const token = bearer(req);
  if (!token) return null;

  const { data: userRes, error } = await createTokenClient(token).auth.getUser();
  if (error || !userRes?.user) return null;

  const svc = createServiceClient();
  const { data: admin } = await svc
    .from("alerto_admins")
    .select("user_id, email, role")
    .eq("user_id", userRes.user.id)
    .maybeSingle();

  if (!admin) return null;
  return {
    userId: admin.user_id,
    email: admin.email,
    role: admin.role as Role,
    aal: aalFromToken(token),
  };
}

/**
 * Guard helper: returns the caller only if they hold `perm` AND — by default —
 * have completed multi-factor authentication (aal2). This is the single place
 * that makes MFA a hard requirement for every sensitive action; the client-side
 * gate is only UX. Pass `{ requireMfa: false }` for the rare endpoint that must
 * work before the second factor is satisfied.
 */
export async function requirePermission(
  req: NextRequest,
  perm: Permission,
  opts: { requireMfa?: boolean } = {},
): Promise<Caller | null> {
  const caller = await getCaller(req);
  if (!caller || !can(caller.role, perm)) return null;
  if ((opts.requireMfa ?? true) && caller.aal !== "aal2") return null;
  return caller;
}
