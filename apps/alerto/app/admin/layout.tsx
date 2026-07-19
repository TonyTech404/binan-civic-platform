"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminProvider, useAdmin } from "@/components/admin/ctx";
import { MfaEnroll, MfaChallenge } from "@/components/admin/mfa";
import { Seal } from "@/components/Seal";
import { Button, Spinner } from "@/components/ui";
import { can, ROLE_LABEL, type Permission } from "@/lib/rbac";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <Shell>{children}</Shell>
    </AdminProvider>
  );
}

function FullSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { loading, session, role, teamEmpty, mfaEnrolled, mfaSatisfied } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();

  const isLogin = pathname === "/admin/login";

  React.useEffect(() => {
    if (!loading && !session && !isLogin) router.replace("/admin/login");
  }, [loading, session, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (loading) return <FullSpinner />;
  if (!session) return <FullSpinner />;
  // MFA gate — enforced before authorization. The server independently requires
  // aal2 on every sensitive route, so this is UX, not the security boundary.
  if (!mfaEnrolled) return <MfaEnroll />;
  if (!mfaSatisfied) return <MfaChallenge />;
  if (!role) return <NoAccess teamEmpty={teamEmpty} />;

  return <Chrome>{children}</Chrome>;
}

const NAV: { href: string; label: string; perm: Permission | null }[] = [
  { href: "/admin", label: "Dashboard", perm: null },
  { href: "/admin/compose", label: "Send Alert", perm: "alerts:send" },
  { href: "/admin/alerts", label: "History", perm: "alerts:view" },
  { href: "/admin/subscribers", label: "Subscribers", perm: "subscribers:view" },
  { href: "/admin/team", label: "Team", perm: "team:view" },
];

function Chrome({ children }: { children: React.ReactNode }) {
  const { session, role, signOut } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-1 bg-brand-600" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[58px] max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <Seal size={30} />
              <span className="font-serif text-[14px] font-bold tracking-[-0.01em] text-slate-900">
                BANTAY BIÑAN
              </span>
            </Link>
            <span className="rounded-sm bg-brand-100 px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.12em] text-brand-600">
              Alerto
            </span>
          </div>
          <div className="flex items-center gap-3">
            {role && (
              <span className="hidden rounded-sm bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 sm:inline">
                {ROLE_LABEL[role]}
              </span>
            )}
            <span className="hidden font-mono text-[11px] text-slate-400 md:inline">
              {session?.user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 px-3 text-[12px]">
              Sign out
            </Button>
          </div>
        </div>
        {/* Nav */}
        <nav className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {NAV.filter((n) => !n.perm || can(role, n.perm)).map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "border-b-2 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors " +
                  (active
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-900")
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 lg:px-8">
        <div key={pathname} className="animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}

function NoAccess({ teamEmpty }: { teamEmpty: boolean }) {
  const { session, authFetch, refresh, signOut } = useAdmin();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function claimOwner() {
    setBusy(true);
    setErr(null);
    const res = await authFetch("/api/team/bootstrap", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Could not claim access.");
      return;
    }
    await refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[440px] rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex justify-center">
          <Seal size={44} />
        </div>
        {teamEmpty ? (
          <>
            <h1 className="font-serif text-[20px] font-bold text-slate-900">
              First-run setup
            </h1>
            <p className="mt-2 text-[14px] leading-[1.55] text-slate-600">
              No team members exist yet. Claim <b>Owner</b> access for{" "}
              <span className="font-mono text-[13px]">{session?.user.email}</span> to
              provision the rest of your team.
            </p>
            {err && <p className="mt-3 text-[13px] text-brand-600">{err}</p>}
            <Button onClick={claimOwner} disabled={busy} size="lg" className="mt-5 w-full">
              {busy && <Spinner className="h-5 w-5" />}
              Claim Owner Access
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-serif text-[20px] font-bold text-slate-900">
              Awaiting access
            </h1>
            <p className="mt-2 text-[14px] leading-[1.55] text-slate-600">
              Your account (<span className="font-mono text-[13px]">{session?.user.email}</span>)
              is signed in but not yet part of the Bantay Alerto team. Ask an
              owner to add you.
            </p>
          </>
        )}
        <button
          onClick={async () => { await signOut(); router.replace("/admin/login"); }}
          className="mt-4 text-[12px] font-semibold text-slate-400 hover:text-slate-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
