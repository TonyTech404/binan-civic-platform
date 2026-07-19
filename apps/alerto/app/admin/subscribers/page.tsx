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

const ITEMS_PER_PAGE = 10;
// Enforcing a precise height for rows so pagination controls stay pinned statically
const ROW_HEIGHT_CLASS = "h-[53px]";

export default function Subscribers() {
  const { loading: authLoading } = useAdmin();
  
  // Data & Interface States
  const [rows, setRows] = React.useState<Sub[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("active");
  const [q, setQ] = React.useState("");
  
  // Database Pagination & Stats States
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [activeCount, setActiveCount] = React.useState(0); // Track total active subs in DB
  const [debouncedQ, setDebouncedQ] = React.useState("");

  // Debounce input to reduce database stress
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1); // Jump back to page 1 on new searches
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  React.useEffect(() => {
    if (authLoading) return;
    // Guard against stale responses: if the deps change (new page/filter/search)
    // before an in-flight request resolves, ignore its result so a slower earlier
    // request can't overwrite the UI with newer data.
    let ignore = false;

    async function fetchData() {
      setLoading(true);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // 1. Fetch the exact metadata count of ACTIVE subscribers (lightning-fast payload-free select)
      const { count: activeDbCount } = await supabase()
        .from("alerto_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (ignore) return;
      setActiveCount(activeDbCount ?? 0);

      // 2. Resolve Barangay text search at the application layer if needed
      let matchingBarangayIds: string[] = [];
      if (debouncedQ) {
        const { data: brgys } = await supabase()
          .from("alerto_barangays")
          .select("id")
          .ilike("name", `%${debouncedQ}%`);

        if (ignore) return;
        if (brgys && brgys.length > 0) {
          matchingBarangayIds = brgys.map((b) => b.id);
        }
      }

      // 3. Build the primary query
      let query = supabase()
        .from("alerto_subscribers")
        .select<string, Sub>("id, telegram_username, full_name, phone, status, created_at, barangay_id, alerto_barangays(name)", {
          count: "exact",
        });

      // Filter by Status
      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Apply Multi-Column Search
      if (debouncedQ) {
        // Wrap each value in double quotes so PostgREST treats commas/parentheses in
        // the search term as literal text instead of or()-filter syntax — an unquoted
        // "Cruz, Jr." would otherwise split the filter and error the whole query.
        // Strip any double quotes/backslashes first so the value can't break out.
        const safeQ = debouncedQ.replace(/["\\]/g, "");
        let orFilter = `full_name.ilike."%${safeQ}%",telegram_username.ilike."%${safeQ}%",phone.ilike."%${safeQ}%"`;

        if (matchingBarangayIds.length > 0) {
          const idListString = matchingBarangayIds.join(",");
          orFilter += `,barangay_id.in.(${idListString})`;
        }

        query = query.or(orFilter);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (ignore) return;
      if (error) {
        console.error("Failed to load subscribers:", error.message);
      } else {
        setRows(data ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    }

    fetchData();
    return () => {
      ignore = true;
    };
  }, [authLoading, page, status, debouncedQ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const emptyRowsCount = ITEMS_PER_PAGE - rows.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Subscribers</h1>
          <p className="mt-1 text-[14px] text-slate-500">
            {rows.length} ipinakita &middot; {activeCount} active
          </p>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Maghanap…" 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            className="h-9 w-[180px]" 
          />
          <Select 
            value={status} 
            onChange={(e) => handleStatusChange(e.target.value)} 
            className="h-9 w-[130px]"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">Lahat</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="h-[583px] flex items-center justify-center">
            <Spinner className="h-6 w-6 text-slate-300" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px] table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    <th className="px-5 py-3 w-[30%]">Pangalan / Username</th>
                    <th className="px-5 py-3 w-[25%]">Barangay</th>
                    <th className="px-5 py-3 w-[20%]">Cellphone</th>
                    <th className="px-5 py-3 w-[12%]">Status</th>
                    <th className="px-5 py-3 w-[13%]">Sumali</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.length === 0 && (
                    <tr className="h-[530px]">
                      <td colSpan={5} className="px-5 text-center text-slate-400 vertical-middle">
                        Walang subscriber na tumugma.
                      </td>
                    </tr>
                  )}
                  
                  {rows.map((r) => (
                    <tr key={r.id} className={`hover:bg-slate-50/80 ${ROW_HEIGHT_CLASS}`}>
                      <td className="px-5 py-2 overflow-hidden truncate">
                        <div className="font-medium text-slate-900 truncate">{r.full_name ?? "—"}</div>
                        {r.telegram_username && (
                          <div className="font-mono text-[11px] text-slate-400 truncate">@{r.telegram_username}</div>
                        )}
                      </td>
                      <td className="px-5 py-2 text-slate-700 truncate">
                        {r.alerto_barangays?.name ?? <span className="text-slate-300">di pa napili</span>}
                      </td>
                      <td className="px-5 py-2 font-mono text-[12px] text-slate-600 truncate">
                        {r.phone ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-2">
                        <Badge 
                          className={
                            r.status === "active" 
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-2 text-[12px] text-slate-400 truncate">
                        {fmtDateTime(r.created_at)}
                      </td>
                    </tr>
                  ))}

                  {/* Empty Spacer Rows keeping layout dimensions locked */}
                  {rows.length > 0 && emptyRowsCount > 0 && Array.from({ length: emptyRowsCount }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className={`${ROW_HEIGHT_CLASS} bg-transparent border-none`}>
                      <td colSpan={5} className="px-5 py-2">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Static Pagination Controls Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[13px] text-slate-500 h-[52px]">
              {totalPages > 0 ? (
                <>
                  <div>
                    Page <b>{page}</b> of <b>{totalPages}</b>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="rounded border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      className="rounded border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-slate-400">Walang pahina</div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}