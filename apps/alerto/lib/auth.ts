import { NextRequest } from "next/server";
import { createServiceClient, createTokenClient } from "@/lib/supabase";
import { type Role, type Permission, can } from "@/lib/rbac";

export type Caller = {
  userId: string;
  email: string;
  role: Role;
};

/**
 * Resolve the staff member behind an admin API request.
 *
 * The browser sends its Supabase access token as `Authorization: Bearer …`.
 * We verify it (getUser), then look up the caller's role in alerto_admins with
 * the service client. Returns null if unauthenticated or not a team member.
 */
export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
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
  return { userId: admin.user_id, email: admin.email, role: admin.role as Role };
}

/** Guard helper: returns the caller only if they hold `perm`, else null. */
export async function requirePermission(
  req: NextRequest,
  perm: Permission,
): Promise<Caller | null> {
  const caller = await getCaller(req);
  if (!caller || !can(caller.role, perm)) return null;
  return caller;
}
