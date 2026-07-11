"use client";

import * as React from "react";
import { useAdmin, supabase } from "@/components/admin/ctx";
import { can, ROLES, ROLE_LABEL, ROLE_DESCRIPTION, type Role } from "@/lib/rbac";
import { Card, Button, Input, Select, Label, Badge, Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";

type Brgy = { id: string; name: string };
type Member = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: Role;
  barangay_id: string | null;
  alerto_barangays: { name: string } | null;
  created_at: string;
};

const ROLE_STYLE: Record<Role, string> = {
  owner: "border-brand-200 bg-brand-50 text-brand-700",
  operator: "border-sky-200 bg-sky-50 text-sky-700",
  viewer: "border-slate-200 bg-slate-50 text-slate-500",
};

export default function Team() {
  const { role, authFetch } = useAdmin();
  const manage = can(role, "team:manage");
  const [members, setMembers] = React.useState<Member[]>([]);
  const [barangays, setBarangays] = React.useState<Brgy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await authFetch("/api/team");
    const data = await res.json().catch(() => ({ members: [] }));
    setMembers(data.members ?? []);
    setLoading(false);
  }, [authFetch]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    supabase().from("alerto_barangays").select("id,name").order("name")
      .then(({ data }) => setBarangays((data ?? []) as Brgy[]));
  }, []);

  async function changeRole(m: Member, newRole: Role) {
    // Owners are city-wide; when promoting to owner we drop the barangay scope.
    const res = await authFetch("/api/team", {
      method: "PATCH",
      body: JSON.stringify({ user_id: m.user_id, role: newRole, barangay_id: newRole === "owner" ? null : m.barangay_id }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNotice(d.error ?? "Hindi nabago ang role."); return; }
    load();
  }

  async function changeScope(m: Member, barangay_id: string) {
    const res = await authFetch("/api/team", {
      method: "PATCH",
      body: JSON.stringify({ user_id: m.user_id, role: m.role, barangay_id: barangay_id || null }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNotice(d.error ?? "Hindi nabago ang scope."); return; }
    load();
  }

  async function remove(user_id: string, email: string) {
    if (!confirm(`Alisin si ${email} sa team?`)) return;
    const res = await authFetch("/api/team", { method: "DELETE", body: JSON.stringify({ user_id }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNotice(d.error ?? "Hindi naalis."); return; }
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Team & Access</h1>
        <p className="mt-1 text-[14px] text-slate-500">Sino ang may access, ano ang kanilang magagawa (RBAC), at aling barangay.</p>
      </div>

      {notice && (
        <div className="rounded-md border-l-[3px] border-l-brand-600 bg-brand-50 px-4 py-2.5 text-[13px] text-brand-700">{notice}</div>
      )}

      {manage && <InviteForm authFetch={authFetch} barangays={barangays} onDone={(m) => { setNotice(m); load(); }} />}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">Members</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center"><Spinner className="mx-auto h-6 w-6 text-slate-300" /></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {members.map((m) => (
              <div key={m.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{m.full_name ?? m.email}</div>
                  <div className="font-mono text-[11px] text-slate-400">{m.email} · sumali {fmtDateTime(m.created_at)}</div>
                </div>

                {manage ? (
                  <>
                    <Select value={m.role} onChange={(e) => changeRole(m, e.target.value as Role)} className="h-9 w-[120px]" title="Role">
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </Select>
                    <Select
                      value={m.barangay_id ?? ""}
                      onChange={(e) => changeScope(m, e.target.value)}
                      disabled={m.role === "owner"}
                      title="Barangay scope"
                      className="h-9 w-[170px] disabled:opacity-50"
                    >
                      <option value="">Buong Lungsod</option>
                      {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </>
                ) : (
                  <>
                    <Badge className={ROLE_STYLE[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                    <ScopeBadge name={m.alerto_barangays?.name} />
                  </>
                )}

                {manage && (
                  <button onClick={() => remove(m.user_id, m.email)} className="text-[12px] font-semibold text-slate-400 hover:text-brand-600">Alisin</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Role legend */}
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r} className="rounded-md border border-slate-200 bg-white p-3.5">
            <Badge className={ROLE_STYLE[r]}>{ROLE_LABEL[r]}</Badge>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-slate-500">{ROLE_DESCRIPTION[r]}</p>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-slate-400">
        <b>Scope:</b> “Buong Lungsod” = access sa lahat ng barangay. Kung naka-assign sa isang barangay, doon lang sila makakakita ng subscriber at makakapagpadala. Ang mga <b>Owner</b> ay laging buong lungsod.
      </p>
    </div>
  );
}

function ScopeBadge({ name }: { name?: string | null }) {
  return name ? (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">{name}</Badge>
  ) : (
    <Badge className="border-slate-200 bg-slate-50 text-slate-500">Buong Lungsod</Badge>
  );
}

function InviteForm({
  authFetch, barangays, onDone,
}: {
  authFetch: (i: string, init?: RequestInit) => Promise<Response>;
  barangays: Brgy[];
  onDone: (msg: string) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<Role>("operator");
  const [barangayId, setBarangayId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const isOwner = role === "owner";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await authFetch("/api/team", {
      method: "POST",
      body: JSON.stringify({
        email, full_name: name || null, role,
        barangay_id: isOwner ? null : (barangayId || null),
        password: password || undefined,
      }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error ?? "Hindi naidagdag."); return; }
    setEmail(""); setName(""); setPassword(""); setRole("operator"); setBarangayId("");
    onDone(d.created ? `Nagawa ang account para kay ${d.email}. Ipaalam sa kanya ang password o gamitin ang “forgot password”.` : `Naidagdag si ${d.email} sa team.`);
  }

  return (
    <Card className="p-5">
      <Label>Magdagdag ng team member</Label>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-12">
        <Input className="sm:col-span-4" type="email" placeholder="email@binan.gov.ph" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input className="sm:col-span-3" placeholder="Pangalan (opsyonal)" value={name} onChange={(e) => setName(e.target.value)} />
        <Select className="sm:col-span-2" value={role} onChange={(e) => setRole(e.target.value as Role)} title="Role">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
        <Select
          className="sm:col-span-3 disabled:opacity-50"
          value={isOwner ? "" : barangayId}
          onChange={(e) => setBarangayId(e.target.value)}
          disabled={isOwner}
          title="Barangay scope"
        >
          <option value="">Buong Lungsod (lahat)</option>
          {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Input className="sm:col-span-3" type="text" placeholder="Temp password (opsyonal)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" disabled={busy} className="sm:col-span-2">{busy ? <Spinner className="h-4 w-4" /> : "Idagdag"}</Button>
      </form>
      {err && <p className="mt-2 text-[13px] text-brand-600">{err}</p>}
      <p className="mt-2 text-[11.5px] text-slate-400">
        Pumili ng barangay para gawing scoped ang staff (doon lang sila may access). Iwan sa “Buong Lungsod” para sa city-level staff. Kung wala pang account ang email, gagawa ng bago gamit ang temp password.
      </p>
    </Card>
  );
}
