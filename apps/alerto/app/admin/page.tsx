"use client";

import * as React from "react";
import Link from "next/link";
import { useAdmin, supabase } from "@/components/admin/ctx";
import { Card, Spinner, Badge } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { SEVERITY_STYLE, STATUS_STYLE } from "@/components/admin/styles";

type Alert = {
  id: string; title: string; severity: string; status: string;
  target_scope: string; created_at: string;
  recipients_total: number; delivered_count: number; failed_count: number;
};

export default function Dashboard() {
  const { loading: authLoading } = useAdmin();
  const [loading, setLoading] = React.useState(true);
  const [activeSubs, setActiveSubs] = React.useState(0);
  const [withPhone, setWithPhone] = React.useState(0);
  const [byBarangay, setByBarangay] = React.useState<{ name: string; count: number }[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  React.useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const sb = supabase();
        const [{ count: active }, { count: phones }, subs, recent] = await Promise.all([
          sb.from("alerto_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
          sb.from("alerto_subscribers").select("id", { count: "exact", head: true }).eq("status", "active").not("phone", "is", null),
          sb.from("alerto_subscribers").select("barangay_id, alerto_barangays(name)").eq("status", "active"),
          sb.from("alerto_alerts").select("id,title,severity,status,target_scope,created_at,recipients_total,delivered_count,failed_count").order("created_at", { ascending: false }).limit(8),
        ]);

        setActiveSubs(active ?? 0);
        setWithPhone(phones ?? 0);

        const map = new Map<string, number>();
        for (const row of (subs.data ?? []) as { alerto_barangays?: { name?: string } }[]) {
          const name = row.alerto_barangays?.name ?? "— (di pa napili)";
          map.set(name, (map.get(name) ?? 0) + 1);
        }
        setByBarangay([...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
        setAlerts((recent.data ?? []) as Alert[]);
      } catch (e) {
        console.error("dashboard load failed:", e);
      } finally {
        setLoading(false); // don't strand the dashboard on the spinner
      }
    })();
  }, [authLoading]);

  if (loading) return <div className="py-20 text-center text-slate-400"><Spinner className="mx-auto h-6 w-6" /></div>;

  const maxCount = Math.max(1, ...byBarangay.map((b) => b.count));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Dashboard</h1>
        <p className="mt-1 text-[14px] text-slate-500">Overview ng subscribers at mga naipadalang alerto.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active Subscribers" value={activeSubs} />
        <Stat label="May Cellphone Number" value={withPhone} sub={`${activeSubs ? Math.round((withPhone / activeSubs) * 100) : 0}% handa sa SMS`} />
        <Stat label="Alerts Sent" value={alerts.filter((a) => a.status === "sent").length} sub="huling 8 ipinakita sa ibaba" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* By barangay */}
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">Subscribers per Barangay</h2>
          </div>
          <div className="max-h-[360px] space-y-2.5 overflow-y-auto p-5">
            {byBarangay.length === 0 && <p className="text-[13px] text-slate-400">Wala pang subscriber.</p>}
            {byBarangay.map((b) => (
              <div key={b.name}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="text-slate-700">{b.name}</span>
                  <span className="font-mono font-semibold text-slate-500">{b.count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent alerts */}
        <Card className="lg:col-span-3">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">Recent Alerts</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.length === 0 && <p className="px-5 py-6 text-[13px] text-slate-400">Wala pang naipadalang alerto.</p>}
            {alerts.map((a) => (
              <Link key={a.id} href={`/admin/alerts/${a.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={SEVERITY_STYLE[a.severity] ?? ""}>{a.severity}</Badge>
                    <span className="truncate text-[14px] font-medium text-slate-900">{a.title}</span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-slate-400">{fmtDateTime(a.created_at)} · {a.target_scope === "city" ? "Buong lungsod" : "Piling barangay"}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[13px] font-semibold text-slate-900">{a.delivered_count}/{a.recipients_total}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">delivered</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1.5 font-mono text-[32px] font-bold leading-none text-slate-900">{value.toLocaleString()}</div>
      {sub && <div className="mt-1.5 text-[12px] text-slate-400">{sub}</div>}
    </Card>
  );
}
