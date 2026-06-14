import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  REPORT_STATUSES,
  STATUS_LABELS,
  CATEGORIES,
  BARANGAYS,
  type Report,
} from "@bantay/shared";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Input, Select, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { categoryIcon, categoryLabel } from "@/components/category";
import { relativeTime } from "@/lib/utils";

export function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [barangay, setBarangay] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    let query = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(500);
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (barangay) query = query.eq("barangay", barangay);

    query.then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setReports((data as Report[]) ?? []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [status, category, barangay]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter(
      (r) =>
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
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading…" : `${filtered.length} shown`}
          </p>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {REPORT_STATUSES.map((s) => (
          <Card key={s}>
            <CardBody className="p-4">
              <p className="text-2xl font-bold">{counts[s] ?? 0}</p>
              <p className="text-sm text-slate-500">{STATUS_LABELS[s]}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="pl-9"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select value={barangay} onChange={(e) => setBarangay(e.target.value)}>
            <option value="">All barangays</option>
            {BARANGAYS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Spinner className="h-6 w-6" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-slate-500">No reports match these filters.</CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const Icon = categoryIcon(r.category);
            return (
              <Link key={r.id} to={`/admin/reports/${r.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardBody className="flex items-center gap-4 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">{r.reference_number}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="truncate text-sm font-medium">{r.description}</p>
                      <p className="text-xs text-slate-500">
                        {categoryLabel(r.category)} · {r.barangay} · {relativeTime(r.created_at)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
