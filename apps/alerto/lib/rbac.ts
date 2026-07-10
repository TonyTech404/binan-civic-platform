// Role-based access control for the Bantay Alerto team.
//
//   owner    → everything, including managing the team
//   operator → compose & send alerts, view everything
//   viewer   → read-only dashboards
//
// Roles live in the alerto_admins table (see the migration). These helpers are
// the single source of truth for "who can do what" and are used on both the
// server (enforcement) and the client (hide/disable controls).

export type Role = "owner" | "operator" | "viewer";

export const ROLES: Role[] = ["owner", "operator", "viewer"];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  operator: "Operator",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Full access — send alerts and manage the team.",
  operator: "Can compose and send alerts.",
  viewer: "Read-only access to dashboards.",
};

export type Permission =
  | "alerts:view"
  | "alerts:send"
  | "subscribers:view"
  | "team:view"
  | "team:manage";

const MATRIX: Record<Role, Permission[]> = {
  owner:    ["alerts:view", "alerts:send", "subscribers:view", "team:view", "team:manage"],
  operator: ["alerts:view", "alerts:send", "subscribers:view", "team:view"],
  viewer:   ["alerts:view", "subscribers:view", "team:view"],
};

export function can(role: Role | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(perm) ?? false;
}
