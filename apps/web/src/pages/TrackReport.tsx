import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { REPORT_STATUSES, STATUS_LABELS, type ReportStatus } from "@bantay/shared";
import { Search, MapPin } from "lucide-react";
import { Button, Card, CardBody, Input, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationMap } from "@/components/LocationMap";
import { categoryIcon, categoryLabel } from "@/components/category";
import { trackReport, photoUrl, type TrackedReport } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function TrackReport() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(ref ?? "");
  const [report, setReport] = useState<TrackedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (ref) void lookup(ref); }, [ref]); // eslint-disable-line

  async function lookup(value: string) {
    const v = value.trim().toUpperCase();
    if (!v) return;
    setLoading(true); setError(null); setReport(null);
    try { setReport(await trackReport(v)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not find that report."); }
    finally { setLoading(false); }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/track/${query.trim().toUpperCase()}`);
  }

  return (
    <div className="bg-slate-50 px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-[760px]">
        <div className="animate-fade-in-up">
          <h1 className="font-serif text-[22px] font-bold tracking-[-0.01em] text-slate-900 sm:text-[26px]">
            Track a Report
          </h1>
          <p className="mt-1.5 mb-6 text-[14px] text-slate-500">
            Enter the reference number you received when you submitted your report.
          </p>

          <form onSubmit={onSubmit} className="mb-7 flex gap-2.5">
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="BB-2026-000123"
              className="h-11 font-mono text-[14px] uppercase tracking-[0.04em] sm:text-[15px]" />
            <Button type="submit" disabled={loading} className="h-11 shrink-0 gap-2 px-5 sm:px-6 transition-transform active:scale-[0.98]">
              {loading ? <Spinner className="h-[14px] w-[14px]" /> : <Search className="h-[14px] w-[14px]" />}
              Track
            </Button>
          </form>
        </div>

        {error && (
          <div className="mb-5 rounded-[3px] border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-700 animate-fade-in">
            {error}
          </div>
        )}

        {report && <ReportView report={report} />}
      </div>
    </div>
  );
}

function ReportView({ report }: { report: TrackedReport }) {
  const Icon = categoryIcon(report.category);
  const currentIdx = REPORT_STATUSES.indexOf(report.status as ReportStatus);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Report card */}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[3px] border border-slate-200 bg-slate-50 sm:h-10 sm:w-10">
              <Icon className="h-4 w-4 text-slate-500 sm:h-[18px] sm:w-[18px]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">{categoryLabel(report.category)}</p>
              <p className="font-mono text-[11px] text-slate-400">{report.reference_number} · {report.barangay}</p>
            </div>
          </div>
          <StatusBadge status={report.status} className="flex-shrink-0" />
        </div>

        <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[14px] leading-[1.6] text-slate-700">{report.description}</p>
          {report.address && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-400">
              <MapPin className="h-3 w-3" /> {report.address}
            </div>
          )}
          <p className="mt-1 text-[12px] text-slate-400">Submitted {formatDate(report.created_at)}</p>
        </div>

        {/* Timeline */}
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Progress</div>
          <ol>
            {REPORT_STATUSES.map((s, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx;
              const entry = [...report.history].reverse().find((h) => h.status === s);
              return (
                <li key={s} className="flex gap-3.5">
                  <div className="flex flex-shrink-0 flex-col items-center">
                    <span className={"flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-bold " +
                      (current ? "bg-brand-600 text-white" : done ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400")}>
                      {i + 1}
                    </span>
                    {i < REPORT_STATUSES.length - 1 && (
                      <span className={"my-0.5 h-8 w-px " + (i < currentIdx ? "bg-slate-900" : "bg-slate-200")} />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className={"text-[13px] font-semibold " + (current ? "text-brand-600" : done ? "text-slate-900" : "text-slate-400")}>
                      {STATUS_LABELS[s]}
                    </p>
                    {entry && <p className="text-[11px] text-slate-400">{formatDate(entry.created_at)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Photos */}
      {(report.photo_key || report.resolution_photo_key) && (
        <Card>
          <CardBody className="p-4 sm:p-5">
            <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {report.photo_key && (
                <figure>
                  <img src={photoUrl(report.photo_key)} alt="Reported issue" className="h-36 w-full rounded-[3px] object-cover sm:h-40" />
                  <figcaption className="mt-1 text-center text-[12px] text-slate-400">Reported</figcaption>
                </figure>
              )}
              {report.resolution_photo_key && (
                <figure>
                  <img src={photoUrl(report.resolution_photo_key)} alt="Resolution" className="h-36 w-full rounded-[3px] object-cover sm:h-40" />
                  <figcaption className="mt-1 text-center text-[12px] text-green-600">Resolved ✓</figcaption>
                </figure>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Map */}
      <div className="overflow-hidden rounded-md border border-slate-200">
        <LocationMap value={{ lat: report.latitude, lng: report.longitude }} interactive={false} className="h-44 w-full sm:h-52" />
      </div>
    </div>
  );
}
