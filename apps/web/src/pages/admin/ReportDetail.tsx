import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { REPORT_STATUSES, STATUS_LABELS, DEPARTMENTS, type Report, type StatusHistoryEntry, type ReportStatus } from "@bantay/shared";
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
  const [report, setReport]   = useState<Report | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [status, setStatus]         = useState<ReportStatus>("open");
  const [department, setDepartment] = useState("");
  const [note, setNote]             = useState("");
  const [resolutionFile, setResolutionFile]       = useState<File | null>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    const [{ data: r }, { data: h }] = await Promise.all([
      supabase.from("reports").select("*").eq("id", id).maybeSingle(),
      supabase.from("status_history").select("*").eq("report_id", id).order("created_at", { ascending: false }),
    ]);
    if (!r) { setNotFound(true); setLoading(false); return; }
    const rep = r as Report;
    setReport(rep); setHistory((h as StatusHistoryEntry[]) ?? []);
    setStatus(rep.status); setDepartment(rep.department_slug ?? "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]); // eslint-disable-line

  function onPickResolution(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResolutionFile(f); setResolutionPreview(URL.createObjectURL(f));
  }

  async function save() {
    if (!report) return;
    setSaving(true); setError(null);
    try {
      let resolution_photo_key: string | undefined;
      if (resolutionFile) resolution_photo_key = await uploadPhoto(resolutionFile);
      await updateReportStatus(report.id, { status, department_slug: (department || undefined) as never, note: note.trim() || undefined, resolution_photo_key });
      setNote(""); setResolutionFile(null); setResolutionPreview(null);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Spinner className="h-6 w-6" /></div>;
  if (notFound || !report) return (
    <div className="py-20 text-center text-[14px] text-slate-500">
      Report not found. <Link to="/admin" className="text-brand-600">Back to dashboard</Link>
    </div>
  );

  const Icon = categoryIcon(report.category);
  const dirty = status !== report.status || department !== (report.department_slug ?? "") || note.trim().length > 0 || resolutionFile != null;

  return (
    <div className="animate-fade-in-up">
      <Link to="/admin" className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-slate-400 transition-colors hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> All reports
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_360px]">
        {/* Left: report details (spans 2 cols on lg) */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Report card */}
          <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[3px] border border-slate-200 bg-slate-50 sm:h-11 sm:w-11">
                  <Icon className="h-4 w-4 text-slate-500 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-slate-900 sm:text-[16px]">{categoryLabel(report.category)}</p>
                  <p className="font-mono text-[10px] text-slate-400 sm:text-[11px]">{report.reference_number}</p>
                </div>
              </div>
              <StatusBadge status={report.status} className="flex-shrink-0" />
            </div>
            <p className="text-[14px] leading-[1.65] text-slate-700">{report.description}</p>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" />{report.barangay}{report.address ? ` · ${report.address}` : ""}</span>
              <span>Submitted {formatDate(report.created_at)}</span>
              {report.reporter_contact && <span>Contact: {report.reporter_contact}</span>}
              {report.department_slug && <span>{DEPARTMENTS.find((d) => d.slug === report.department_slug)?.name ?? report.department_slug}</span>}
            </div>
          </div>

          {/* Photos */}
          {(report.photo_key || report.resolution_photo_key) && (
            <Card><CardBody className="p-4 sm:p-5">
              <h2 className="mb-3 text-[13px] font-semibold text-slate-900">Photos</h2>
              <div className="grid grid-cols-2 gap-3">
                {report.photo_key && (
                  <figure>
                    <a href={photoUrl(report.photo_key)} target="_blank" rel="noreferrer">
                      <img src={photoUrl(report.photo_key)} alt="Reported" className="h-36 w-full rounded-[3px] object-cover sm:h-44" />
                    </a>
                    <figcaption className="mt-1 text-center text-[12px] text-slate-400">Reported</figcaption>
                  </figure>
                )}
                {report.resolution_photo_key && (
                  <figure>
                    <a href={photoUrl(report.resolution_photo_key)} target="_blank" rel="noreferrer">
                      <img src={photoUrl(report.resolution_photo_key)} alt="Resolution" className="h-36 w-full rounded-[3px] object-cover sm:h-44" />
                    </a>
                    <figcaption className="mt-1 text-center text-[12px] text-green-600">Resolution proof ✓</figcaption>
                  </figure>
                )}
              </div>
            </CardBody></Card>
          )}

          {/* Map */}
          <div className="overflow-hidden rounded-md border border-slate-200">
            <LocationMap value={{ lat: report.latitude, lng: report.longitude }} interactive={false} className="h-48 w-full sm:h-[200px]" />
          </div>

          {/* Activity log */}
          <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Activity Log</div>
            <ul className="space-y-3.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-3">
                  <StatusBadge status={h.status} className="mt-[1px] flex-shrink-0" />
                  <div>
                    {h.note && <p className="text-[13px] leading-[1.5] text-slate-700">{h.note}</p>}
                    <p className="text-[11px] text-slate-400">{formatDate(h.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: manage panel */}
        <div>
          <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-6 lg:sticky lg:top-6">
            <div className="mb-5 border-b border-slate-100 pb-4 text-[13px] font-bold tracking-[-0.01em] text-slate-900">
              Manage Report
            </div>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus)}>
                  {REPORT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </Select>
              </div>
              <div>
                <Label>Assigned Department</Label>
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Unassigned</option>
                  {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Note <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span></Label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an update for the activity log…" />
              </div>
              <div>
                <Label>Resolution Photo</Label>
                <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPickResolution} />
                {resolutionPreview ? (
                  <img src={resolutionPreview} alt="Resolution preview" className="h-28 w-full rounded-[3px] object-cover sm:h-32" />
                ) : (
                  <button type="button" onClick={() => fileInput.current?.click()}
                    className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-600">
                    <Upload className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                    <span className="text-[11px] sm:text-[12px]">Upload proof of completion</span>
                  </button>
                )}
              </div>
              {error && <p className="text-[13px] text-brand-600">{error}</p>}
              <Button className="w-full transition-transform active:scale-[0.99]" onClick={save} disabled={!dirty || saving}>
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              {!dirty && <p className="text-center text-[11px] text-slate-300">Make a change to enable save</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
