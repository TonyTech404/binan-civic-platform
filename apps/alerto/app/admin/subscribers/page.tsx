"use client";

import * as React from "react";
import { supabase, useAdmin } from "@/components/admin/ctx";
import { Card, Select, Input, Badge, Spinner } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";

type Sub = {
  id: string;
  telegram_username: string | null;
  full_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  barangay_id: string | null;
  alerto_barangays: { name: string } | null;
};

export default function Subscribers() {
  const { loading: authLoading } = useAdmin();
  const [rows, setRows] = React.useState<Sub[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("active");
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (authLoading) return;
    supabase()
      .from("alerto_subscribers")
      .select("id,telegram_username,full_name,phone,status,created_at,barangay_id,alerto_barangays(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as unknown as Sub[]); setLoading(false); });
  }, [authLoading]);

  const filtered = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (q) {
      const hay = `${r.full_name ?? ""} ${r.telegram_username ?? ""} ${r.phone ?? ""} ${r.alerto_barangays?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Subscribers</h1>
          <p className="mt-1 text-[14px] text-slate-500">{filtered.length} ipinakita · {rows.filter((r) => r.status === "active").length} active</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Maghanap…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-[180px]" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-[130px]">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">Lahat</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><Spinner className="mx-auto h-6 w-6 text-slate-300" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-5 py-3">Pangalan / Username</th>
                  <th className="px-5 py-3">Barangay</th>
                  <th className="px-5 py-3">Cellphone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sumali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Walang subscriber na tumugma.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{r.full_name ?? "—"}</div>
                      {r.telegram_username && <div className="font-mono text-[11px] text-slate-400">@{r.telegram_username}</div>}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{r.alerto_barangays?.name ?? <span className="text-slate-300">di pa napili</span>}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-slate-600">{r.phone ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <Badge className={r.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}>{r.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-slate-400">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
