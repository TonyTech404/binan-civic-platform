"use client";

import * as React from "react";
import { useAdmin } from "@/components/admin/ctx";
import { Card, Button, Badge, Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { SEVERITY_STYLE, SEVERITY_LABEL, CATEGORY_LABEL } from "@/components/admin/styles";

type Pending = {
  id: string;
  title: string;
  body: string;
  category: string;
  severity: string;
  target_scope: "city" | "barangays";
  created_at: string;
  target_count: number | null;
  submitter: { email: string; full_name: string | null } | null;
};

export default function Approvals() {
  const { canApprove, authFetch } = useAdmin();
  const [rows, setRows] = React.useState<Pending[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await authFetch("/api/alerts/pending");
    const data = await res.json().catch(() => ({ alerts: [] }));
    setRows(data.alerts ?? []);
    setLoading(false);
  }, [authFetch]);

  React.useEffect(() => {
    if (canApprove) load();
    else setLoading(false);
  }, [canApprove, load]);

  if (!canApprove) {
    return <p className="py-20 text-center text-[14px] text-slate-500">Ikaw ay walang permiso para mag-approve ng alerto.</p>;
  }

  async function approve(id: string) {
    if (!confirm("Aprubahan at ipadala ang alerto na ito ngayon?")) return;
    setBusyId(id);
    setNotice(null);
    const res = await authFetch(`/api/alerts/${id}/approve`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) { setNotice(d.error ?? "Hindi na-approve."); return; }
    // Drain any remaining recipients in batches (same as compose).
    let data = d;
    let guard = 0;
    while (data.pending > 0 && guard < 300) {
      guard++;
      const r = await authFetch(`/api/alerts/${id}/send`, { method: "POST" });
      const nd = await r.json().catch(() => null);
      if (!r.ok || !nd || nd.processed === 0) break;
      data = nd;
    }
    setNotice(`Naaprubahan at naipadala — naabot ang ${data.sent ?? 0} na subscriber.`);
    load();
  }

  async function reject(id: string) {
    const note = prompt("Dahilan ng pagtanggi (opsyonal):") ?? "";
    setBusyId(id);
    setNotice(null);
    const res = await authFetch(`/api/alerts/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) });
    const d = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) { setNotice(d.error ?? "Hindi na-reject."); return; }
    setNotice("Tinanggihan ang alerto.");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Mga Naghihintay ng Approval</h1>
        <p className="mt-1 text-[14px] text-slate-500">Suriin ang mga alerto bago ipadala. Aprubahan para ipadala, o tanggihan.</p>
      </div>

      {notice && (
        <div className="rounded-md border-l-[3px] border-l-brand-600 bg-brand-50 px-4 py-2.5 text-[13px] text-brand-700">{notice}</div>
      )}

      {loading ? (
        <div className="py-16 text-center"><Spinner className="mx-auto h-6 w-6 text-slate-300" /></div>
      ) : rows.length === 0 ? (
        <Card className="py-16 text-center text-[14px] text-slate-400">Walang naghihintay na alerto. 🎉</Card>
      ) : (
        <div className="space-y-4">
          {rows.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={SEVERITY_STYLE[a.severity] ?? ""}>{SEVERITY_LABEL[a.severity] ?? a.severity}</Badge>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{CATEGORY_LABEL[a.category] ?? a.category}</span>
                <span className="ml-auto text-[12px] text-slate-400">
                  {a.target_scope === "city" ? "Buong Lungsod" : `${a.target_count ?? 0} barangay`}
                </span>
              </div>
              <h2 className="mt-2.5 text-[16px] font-bold text-slate-900">{a.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-[1.55] text-slate-700">{a.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
                <span>Isinumite ni <b className="font-medium text-slate-600">{a.submitter?.full_name || a.submitter?.email || "—"}</b></span>
                <span>&middot; {fmtDateTime(a.created_at)}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => approve(a.id)} disabled={busyId === a.id}>
                  {busyId === a.id && <Spinner className="h-4 w-4" />}
                  Aprubahan at ipadala
                </Button>
                <Button size="sm" variant="outline" onClick={() => reject(a.id)} disabled={busyId === a.id}>
                  Tanggihan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
