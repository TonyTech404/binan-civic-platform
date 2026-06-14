import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  REPORT_STATUSES,
  STATUS_LABELS,
  DEPARTMENTS,
  type Report,
  type StatusHistoryEntry,
  type ReportStatus,
} from "@bantay/shared";
import { ArrowLeft, MapPin, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, CardBody, Label, Select, Textarea, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationMap } from "@/components/LocationMap";
import { categoryIcon, categoryLabel } from "@/components/category";
import { updateReportStatus, uploadPhoto, photoUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit form state
  const [status, setStatus] = useState<ReportStatus>("open");
  const [department, setDepartment] = useState("");
  const [note, setNote] = useState("");
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    const [{ data: r }, { data: h }] = await Promise.all([
      supabase.from("reports").select("*").eq("id", id).maybeSingle(),
      supabase.from("status_history").select("*").eq("report_id", id).order("created_at", { ascending: false }),
    ]);
    if (!r) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const rep = r as Report;
    setReport(rep);
    setHistory((h as StatusHistoryEntry[]) ?? []);
    setStatus(rep.status);
    setDepartment(rep.department_slug ?? "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onPickResolution(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResolutionFile(f);
    setResolutionPreview(URL.createObjectURL(f));
  }

  async function save() {
    if (!report) return;
    setSaving(true);
    setError(null);
    try {
      let resolution_photo_key: string | undefined;
      if (resolutionFile) resolution_photo_key = await uploadPhoto(resolutionFile);
      await updateReportStatus(report.id, {
        status,
        department_slug: (department || undefined) as never,
        note: note.trim() || undefined,
        resolution_photo_key,
      });
      setNote("");
      setResolutionFile(null);
      setResolutionPreview(null);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (notFound || !report) {
    return (
      <div className="py-20 text-center text-slate-500">
        Report not found.{" "}
        <Link to="/admin" className="text-brand-600">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const Icon = categoryIcon(report.category);
  const dirty =
    status !== report.status ||
    department !== (report.department_slug ?? "") ||
    note.trim().length > 0 ||
    resolutionFile != null;

  return (
    <div>
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> All reports
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{categoryLabel(report.category)}</p>
                    <p className="font-mono text-sm text-slate-500">{report.reference_number}</p>
                  </div>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <p className="mt-4 text-slate-700">{report.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {report.barangay}
                  {report.address ? ` · ${report.address}` : ""}
                </span>
                <span>Submitted {formatDate(report.created_at)}</span>
                {report.reporter_contact && <span>Contact: {report.reporter_contact}</span>}
              </div>
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
                      <a href={photoUrl(report.photo_key)} target="_blank" rel="noreferrer">
                        <img src={photoUrl(report.photo_key)} alt="Reported" className="h-44 w-full rounded-xl object-cover" />
                      </a>
                      <figcaption className="mt-1 text-center text-xs text-slate-500">Reported</figcaption>
                    </figure>
                  )}
                  {report.resolution_photo_key && (
                    <figure>
                      <a href={photoUrl(report.resolution_photo_key)} target="_blank" rel="noreferrer">
                        <img src={photoUrl(report.resolution_photo_key)} alt="Resolution" className="h-44 w-full rounded-xl object-cover" />
                      </a>
                      <figcaption className="mt-1 text-center text-xs text-emerald-600">Resolution proof ✓</figcaption>
                    </figure>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="p-0">
              <LocationMap
                value={{ lat: report.latitude, lng: report.longitude }}
                interactive={false}
                className="h-64 w-full overflow-hidden rounded-2xl"
              />
            </CardBody>
          </Card>

          {/* History */}
          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold">Activity</h2>
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <StatusBadge status={h.status} />
                    <div>
                      {h.note && <p className="text-slate-700">{h.note}</p>}
                      <p className="text-xs text-slate-400">{formatDate(h.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        {/* Right: manage */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardBody className="space-y-4">
              <h2 className="font-semibold">Manage report</h2>

              <div>
                <Label>Status</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus)}>
                  {REPORT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Assign department</Label>
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Unassigned</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Note (optional)</Label>
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an update for the activity log…"
                />
              </div>

              <div>
                <Label>Resolution photo</Label>
                <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPickResolution} />
                {resolutionPreview ? (
                  <img src={resolutionPreview} alt="Resolution preview" className="h-32 w-full rounded-xl object-cover" />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600"
                  >
                    <Upload className="h-5 w-5" /> Upload proof of completion
                  </button>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button className="w-full" onClick={save} disabled={!dirty || saving}>
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
