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

  useEffect(() => {
    if (ref) void lookup(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  async function lookup(value: string) {
    const v = value.trim().toUpperCase();
    if (!v) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      setReport(await trackReport(v));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that report.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/track/${query.trim().toUpperCase()}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Track a report</h1>
      <p className="mt-1 text-slate-600">Enter the reference number you received.</p>

      <form onSubmit={onSubmit} className="mt-5 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="BB-2026-000123"
          className="font-mono uppercase"
        />
        <Button type="submit" disabled={loading}>
          {loading ? <Spinner className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          Track
        </Button>
      </form>

      {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }: { report: TrackedReport }) {
  const Icon = categoryIcon(report.category);
  const currentIdx = REPORT_STATUSES.indexOf(report.status as ReportStatus);

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{categoryLabel(report.category)}</p>
                <p className="text-sm text-slate-500">
                  {report.barangay} · {report.reference_number}
                </p>
              </div>
            </div>
            <StatusBadge status={report.status} />
          </div>

          <p className="mt-4 text-slate-700">{report.description}</p>
          {report.address && (
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-4 w-4" /> {report.address}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">Submitted {formatDate(report.created_at)}</p>
        </CardBody>
      </Card>

      {/* Status timeline */}
      <Card>
        <CardBody>
          <h2 className="mb-4 font-semibold">Progress</h2>
          <ol className="space-y-0">
            {REPORT_STATUSES.map((s, i) => {
              const done = i <= currentIdx;
              const entry = [...report.history].reverse().find((h) => h.status === s);
              return (
                <li key={s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
                        (done ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-400")
                      }
                    >
                      {i + 1}
                    </span>
                    {i < REPORT_STATUSES.length - 1 && (
                      <span className={"my-0.5 h-8 w-0.5 " + (i < currentIdx ? "bg-brand-600" : "bg-slate-200")} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={done ? "font-medium" : "text-slate-400"}>{STATUS_LABELS[s]}</p>
                    {entry && (
                      <p className="text-xs text-slate-400">{formatDate(entry.created_at)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      {/* Photos */}
      {(report.photo_key || report.resolution_photo_key) && (
        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold">Photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {report.photo_key && (
                <figure>
                  <img src={photoUrl(report.photo_key)} alt="Reported issue" className="h-40 w-full rounded-xl object-cover" />
                  <figcaption className="mt-1 text-center text-xs text-slate-500">Reported</figcaption>
                </figure>
              )}
              {report.resolution_photo_key && (
                <figure>
                  <img src={photoUrl(report.resolution_photo_key)} alt="Resolution" className="h-40 w-full rounded-xl object-cover" />
                  <figcaption className="mt-1 text-center text-xs text-emerald-600">Resolved ✓</figcaption>
                </figure>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Map */}
      <Card>
        <CardBody className="p-0">
          <LocationMap
            value={{ lat: report.latitude, lng: report.longitude }}
            interactive={false}
            className="h-52 w-full overflow-hidden rounded-2xl"
          />
        </CardBody>
      </Card>
    </div>
  );
}
