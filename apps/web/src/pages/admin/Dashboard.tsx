import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { REPORT_STATUSES, STATUS_LABELS, CATEGORIES, BARANGAYS, type Report } from "@bantay/shared";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input, Select, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { categoryIcon, categoryLabel } from "@/components/category";
import { relativeTime } from "@/lib/utils";

const STATUS_ACCENT: Record<string, string> = {
  open:        "border-t-slate-400",
  assigned:    "border-t-amber-400",
  in_progress: "border-t-blue-500",
  resolved:    "border-t-green-500",
};
const STATUS_SUBLABEL: Record<string, string> = {
  open: "Awaiting assignment", assigned: "Routed to departments",
  in_progress: "Active repair work", resolved: "All time",
};

export function Dashboard() {
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [status, setStatus]     = useState("");
  const [category, setCategory] = useState("");
  const [barangay, setBarangay] = useState("");
  const [q, setQ]               = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    let query = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(500);
    if (status)   query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (barangay) query = query.eq("barangay", barangay);
    query.then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setReports((data as Report[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [status, category, barangay]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((r) =>
      r.reference_number.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      (r.address ?? "").toLowerCase().includes(term),
    );
  }, [reports, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reports) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [reports]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="font-serif text-[22px] font-bold tracking-[-0.01em] text-slate-900 sm:text-[24px]">Reports</h1>
        <p className="text-[13px] text-slate-400">{loading ? "Loading…" : `${reports.length} total · Updated just now`}</p>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {REPORT_STATUSES.map((s) => (
          <div key={s} className={"rounded-md border border-slate-200 border-t-[3px] bg-white px-4 py-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md sm:px-6 sm:py-5 " + (STATUS_ACCENT[s] ?? "border-t-slate-400")}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{STATUS_LABELS[s]}</div>
            <div className="mb-1 font-serif text-[32px] font-bold leading-none text-slate-900 sm:text-[44px]">{counts[s] ?? 0}</div>
            <div className="text-[11px] text-slate-400 sm:text-[12px]">{STATUS_SUBLABEL[s]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-2 sm:p-3.5 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative flex items-center sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by reference, description…" className="h-[38px] pl-9 text-[13px]" />
        </div>
        <Select value={status}   onChange={(e) => setStatus(e.target.value)}   className="h-[38px] text-[13px]">
          <option value="">All statuses</option>
          {REPORT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-[38px] text-[13px]">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </Select>
        <Select value={barangay} onChange={(e) => setBarangay(e.target.value)} className="h-[38px] text-[13px]">
          <option value="">All barangays</option>
          {BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>
      </div>

      {error && <div className="rounded-[3px] border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-700">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white py-12 text-center text-[14px] text-slate-400">
          No reports match these filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          {/* Mobile: card list */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {filtered.map((r) => {
              const Icon = categoryIcon(r.category);
              return (
                <Link key={r.id} to={`/admin/reports/${r.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[3px] border border-slate-200 bg-slate-50">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">{r.reference_number}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="truncate text-[13px] font-medium text-slate-900">{r.description}</p>
                    <p className="text-[11px] text-slate-400">{categoryLabel(r.category)} · {r.barangay} · {relativeTime(r.created_at)}</p>
                  </div>
                  <span className="text-[14px] text-slate-300">→</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Ref. No.", "Status", "Category", "Description", "Barangay", "Submitted", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const Icon = categoryIcon(r.category);
                  return (
                    <tr key={r.id} className={"cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 " + (i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]")}>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link to={`/admin/reports/${r.id}`} className="block font-mono text-[11px] text-slate-500">{r.reference_number}</Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link to={`/admin/reports/${r.id}`} className="block"><StatusBadge status={r.status} /></Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <Link to={`/admin/reports/${r.id}`} className="flex items-center gap-2 text-[13px] text-slate-600">
                          <Icon className="h-3.5 w-3.5 text-slate-400" />{categoryLabel(r.category)}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5" style={{ maxWidth: 280 }}>
                        <Link to={`/admin/reports/${r.id}`} className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-slate-900">
                          {r.description}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-slate-500">
                        <Link to={`/admin/reports/${r.id}`} className="block">{r.barangay}</Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-slate-400">
                        <Link to={`/admin/reports/${r.id}`} className="block">{relativeTime(r.created_at)}</Link>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[14px] text-slate-300">
                        <Link to={`/admin/reports/${r.id}`} className="block">→</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
