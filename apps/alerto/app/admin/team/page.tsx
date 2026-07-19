"use client";

import * as React from "react";
import { useAdmin } from "@/components/admin/ctx";
import { can, ROLES, ROLE_LABEL, ROLE_DESCRIPTION, type Role } from "@/lib/rbac";
import { Card, Button, Input, Select, Label, Badge, Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";

type Member = { user_id: string; email: string; full_name: string | null; role: Role; created_at: string };

const ROLE_STYLE: Record<Role, string> = {
  owner: "border-brand-200 bg-brand-50 text-brand-700",
  operator: "border-sky-200 bg-sky-50 text-sky-700",
  viewer: "border-slate-200 bg-slate-50 text-slate-500",
};

export default function Team() {
  const { role, authFetch } = useAdmin();
  const manage = can(role, "team:manage");
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await authFetch("/api/team");
    const data = await res.json().catch(() => ({ members: [] }));
    setMembers(data.members ?? []);
    setLoading(false);
  }, [authFetch]);

  React.useEffect(() => { load(); }, [load]);

  async function changeRole(user_id: string, newRole: Role) {
    const res = await authFetch("/api/team", { method: "PATCH", body: JSON.stringify({ user_id, role: newRole }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNotice(d.error ?? "Hindi nabago ang role."); return; }
    load();
  }

  async function remove(user_id: string, email: string) {
    if (!confirm(`Alisin si ${email} sa team?`)) return;
    const res = await authFetch("/api/team", { method: "DELETE", body: JSON.stringify({ user_id }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNotice(d.error ?? "Hindi naalis."); return; }
    load();
  }

  async function resetMfa(user_id: string, email: string) {
    if (!confirm(`I-reset ang 2-step verification ni ${email}? Mag-se-setup siya ulit sa susunod na login.`)) return;
    const res = await authFetch("/api/team/reset-mfa", { method: "POST", body: JSON.stringify({ user_id }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNotice(d.error ?? "Hindi na-reset ang MFA."); return; }
    setNotice(`Na-reset ang 2-step verification ni ${email}. Mag-se-setup siya ulit sa susunod na login.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Team & Access</h1>
        <p className="mt-1 text-[14px] text-slate-500">Sino ang may access at ano ang kanilang magagawa (RBAC).</p>
      </div>

      {notice && (
        <div className="rounded-md border-l-[3px] border-l-brand-600 bg-brand-50 px-4 py-2.5 text-[13px] text-brand-700">{notice}</div>
      )}

      {manage && <InviteForm authFetch={authFetch} onDone={(m) => { setNotice(m); load(); }} />}

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
                  <Select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value as Role)} className="h-9 w-[130px]">
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                ) : (
                  <Badge className={ROLE_STYLE[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                )}
                {manage && (
                  <button onClick={() => resetMfa(m.user_id, m.email)} className="text-[12px] font-semibold text-slate-400 hover:text-brand-600">Reset MFA</button>
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
    </div>
  );
}

function InviteForm({ authFetch, onDone }: { authFetch: (i: string, init?: RequestInit) => Promise<Response>; onDone: (msg: string) => void }) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<Role>("operator");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await authFetch("/api/team", {
      method: "POST",
      body: JSON.stringify({ email, full_name: name || null, role, password: password || undefined }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error ?? "Hindi naidagdag."); return; }
    setEmail(""); setName(""); setPassword(""); setRole("operator");
    onDone(d.created ? `Nagawa ang account para kay ${d.email}. Ipaalam sa kanya ang password o gamitin ang “forgot password”.` : `Naidagdag si ${d.email} sa team.`);
  }

  return (
    <Card className="p-5">
      <Label>Magdagdag ng team member</Label>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-12">
        <Input className="sm:col-span-4" type="email" placeholder="email@binan.gov.ph" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input className="sm:col-span-3" placeholder="Pangalan (opsyonal)" value={name} onChange={(e) => setName(e.target.value)} />
        <Select className="sm:col-span-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
        <Input className="sm:col-span-2" type="text" placeholder="Temp password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" disabled={busy} className="sm:col-span-1">{busy ? <Spinner className="h-4 w-4" /> : "Add"}</Button>
      </form>
      {err && <p className="mt-2 text-[13px] text-brand-600">{err}</p>}
      <p className="mt-2 text-[11.5px] text-slate-400">Kung wala pang account ang email, gagawa ng bago. Ibigay ang temp password (o iwan itong blangko para sa auto-generated — kailangan nilang mag-reset).</p>
    </Card>
  );
}
