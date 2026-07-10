"use client";

import * as React from "react";
import Link from "next/link";
import { supabase, useAdmin } from "@/components/admin/ctx";
import { Card, Badge, Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { SEVERITY_STYLE, STATUS_STYLE, CATEGORY_LABEL } from "@/components/admin/styles";

type Alert = {
  id: string; title: string; category: string; severity: string; status: string;
  target_scope: string; created_at: string;
  recipients_total: number; delivered_count: number; failed_count: number;
};

export default function History() {
  const { loading: authLoading } = useAdmin();
  const [rows, setRows] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (authLoading) return;
    supabase()
      .from("alerto_alerts")
      .select("id,title,category,severity,status,target_scope,created_at,recipients_total,delivered_count,failed_count")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as Alert[]); setLoading(false); });
  }, [authLoading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Alert History</h1>
        <p className="mt-1 text-[14px] text-slate-500">Lahat ng mensaheng naipadala.</p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><Spinner className="mx-auto h-6 w-6 text-slate-300" /></div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-[14px] text-slate-400">Wala pang naipadalang alerto.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((a) => (
              <Link key={a.id} href={`/admin/alerts/${a.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-slate-50">
                <Badge className={SEVERITY_STYLE[a.severity] ?? ""}>{a.severity}</Badge>
                <span className="flex-1 truncate text-[14px] font-medium text-slate-900">{a.title}</span>
                <span className="text-[11px] text-slate-400">{CATEGORY_LABEL[a.category] ?? a.category} · {a.target_scope === "city" ? "Buong lungsod" : "Piling barangay"}</span>
                <Badge className={STATUS_STYLE[a.status] ?? ""}>{a.status}</Badge>
                <span className="w-[68px] text-right font-mono text-[13px] font-semibold text-slate-900">{a.delivered_count}/{a.recipients_total}</span>
                <span className="hidden w-[150px] text-right text-[11.5px] text-slate-400 sm:inline">{fmtDateTime(a.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
