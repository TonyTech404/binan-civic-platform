"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase, useAdmin } from "@/components/admin/ctx";
import { can } from "@/lib/rbac";
import { Card, Badge, Button, Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { SEVERITY_STYLE, STATUS_STYLE, CATEGORY_LABEL } from "@/components/admin/styles";

type Alert = {
  id: string; title: string; body: string; category: string; severity: string;
  status: string; target_scope: string; created_at: string; sent_at: string | null;
  recipients_total: number; delivered_count: number; failed_count: number;
};
type Log = {
  id: string; channel: string; destination: string; status: string; error: string | null;
  alerto_subscribers: { full_name: string | null; telegram_username: string | null; alerto_barangays: { name: string } | null } | null;
};

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const { loading: authLoading, role, authFetch } = useAdmin();
  const [alert, setAlert] = React.useState<Alert | null>(null);
  const [targets, setTargets] = React.useState<string[]>([]);
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draining, setDraining] = React.useState(false);
  const [dprog, setDprog] = React.useState<{ sent: number; total: number } | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    const sb = supabase();
    const [a, t, l] = await Promise.all([
      sb.from("alerto_alerts").select("*").eq("id", id).maybeSingle(),
      sb.from("alerto_alert_targets").select("alerto_barangays(name)").eq("alert_id", id),
      sb.from("alerto_send_logs").select("id,channel,destination,status,error,alerto_subscribers(full_name,telegram_username,alerto_barangays(name))").eq("alert_id", id),
    ]);
    setAlert(a.data as Alert | null);
    setTargets(((t.data ?? []) as { alerto_barangays?: { name?: string } }[]).map((r) => r.alerto_barangays?.name ?? "").filter(Boolean));
    setLogs((l.data ?? []) as unknown as Log[]);
    setLoading(false);
  }, [id]);

  React.useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const pending = logs.filter((l) => l.status === "pending").length;

  // Continue an incomplete broadcast: drain pending recipients batch-by-batch.
  async function continueSend() {
    setDraining(true);
    let guard = 0;
    let more = true;
    while (more && guard < 300) {
      guard++;
      const r = await authFetch(`/api/alerts/${id}/send`, { method: "POST" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) break;
      setDprog({ sent: d.sent, total: d.total });
      more = d.pending > 0 && d.processed > 0;
    }
    await load();
    setDraining(false);
    setDprog(null);
  }

  if (loading) return <div className="py-20 text-center"><Spinner className="mx-auto h-6 w-6 text-slate-300" /></div>;
  if (!alert) return <p className="py-20 text-center text-slate-400">Hindi mahanap ang alerto.</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/alerts" className="text-[12px] font-semibold text-slate-500 hover:text-slate-900">← Alert History</Link>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={SEVERITY_STYLE[alert.severity] ?? ""}>{alert.severity}</Badge>
              <Badge className={STATUS_STYLE[alert.status] ?? ""}>{alert.status}</Badge>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">{CATEGORY_LABEL[alert.category] ?? alert.category}</span>
            </div>
            <h1 className="font-serif text-[20px] font-bold leading-snug text-slate-900">{alert.title}</h1>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.55] text-slate-700">{alert.body}</p>
            <div className="mt-4 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
              <div>Ipinadala: {fmtDateTime(alert.sent_at ?? alert.created_at)}</div>
              <div className="mt-1">Target: {alert.target_scope === "city" ? "Buong lungsod" : targets.join(", ") || "Piling barangay"}</div>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Total" value={alert.recipients_total} />
            <MiniStat label="Delivered" value={alert.delivered_count} tone="emerald" />
            <MiniStat label="Failed" value={alert.failed_count} tone="brand" />
          </div>

          {pending > 0 && (
            <Card className="border-amber-200 bg-amber-50 p-4">
              <div className="text-[13px] text-amber-800">
                <b className="font-mono">{pending}</b> pang naka-pila — hindi pa naipapadala.
              </div>
              {can(role, "alerts:send") ? (
                <Button onClick={continueSend} disabled={draining} className="mt-2.5 w-full">
                  {draining && <Spinner className="h-4 w-4" />}
                  {draining ? (dprog ? `Ipinapadala… ${dprog.sent}/${dprog.total}` : "Ipinapadala…") : "Ipagpatuloy ang pagpapadala"}
                </Button>
              ) : (
                <div className="mt-1 text-[11.5px] text-amber-700">Hilingin sa isang operator na ipagpatuloy.</div>
              )}
            </Card>
          )}
        </div>

        {/* Delivery log */}
        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">Delivery Log</h2>
            <button onClick={load} className="text-[12px] font-semibold text-slate-400 hover:text-slate-700">Refresh</button>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-[13px]">
              <tbody className="divide-y divide-slate-50">
                {logs.length === 0 && <tr><td className="px-5 py-8 text-center text-slate-400">Walang recipient.</td></tr>}
                {logs.map((l) => {
                  const s = l.alerto_subscribers;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-slate-900">{s?.full_name ?? s?.telegram_username ?? l.destination}</div>
                        <div className="text-[11px] text-slate-400">{s?.alerto_barangays?.name ?? "—"}</div>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Badge className={l.status === "sent" || l.status === "delivered" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : l.status === "failed" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-slate-50 text-slate-500"}>{l.status}</Badge>
                        {l.error && <div className="mt-0.5 max-w-[180px] truncate text-[10px] text-brand-500" title={l.error}>{l.error}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "brand" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "brand" ? "text-brand-600" : "text-slate-900";
  return (
    <Card className="p-3.5 text-center">
      <div className={"font-mono text-[22px] font-bold leading-none " + color}>{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</div>
    </Card>
  );
}
