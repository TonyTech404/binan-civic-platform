import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CATEGORIES,
  BARANGAYS,
  reportSubmissionSchema,
  type CategorySlug,
} from "@bantay/shared";
import { Camera, Crosshair, CheckCircle2, Copy, Loader2, X } from "lucide-react";
import { Button, Input, Label, Select, Textarea, Spinner } from "@/components/ui";
import { LocationMap } from "@/components/LocationMap";
import { categoryIcon } from "@/components/category";
import { submitReport, uploadPhoto, type SubmitResult } from "@/lib/api";

type Coords = { lat: number; lng: number };

export function SubmitReport() {
  const [params] = useSearchParams();
  const [category, setCategory] = useState<CategorySlug | "">(
    (params.get("category") as CategorySlug) || "",
  );
  const [description, setDescription] = useState("");
  const [barangay, setBarangay] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => { locate(false); }, []); // eslint-disable-line

  function locate(explicit: boolean) {
    if (!navigator.geolocation) {
      if (explicit) setError("Your device doesn't support location. Tap the map to set it.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocating(false); if (explicit) setError("Couldn't get your location. Tap the map to set it manually."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError("Photo is larger than 8 MB."); return; }
    setFile(f); setPreview(URL.createObjectURL(f)); setError(null);
  }

  function clearPhoto() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const payload = {
      category, description: description.trim(), barangay,
      latitude: coords?.lat ?? NaN, longitude: coords?.lng ?? NaN,
      address: address.trim() || undefined,
      reporter_contact: contact.trim() || undefined,
    };
    const parsed = reportSubmissionSchema.omit({ photo_key: true }).safeParse(payload);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      setError(first ?? "Please complete the required fields.");
      if (!coords) setError("Please set the location by tapping the map or using your GPS.");
      return;
    }
    setSubmitting(true);
    try {
      let photo_key: string | undefined;
      if (file) photo_key = await uploadPhoto(file);
      const res = await submitReport({ ...parsed.data, photo_key });
      setResult(res); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setSubmitting(false); }
  }

  if (result) return <SuccessCard result={result} />;

  return (
    <div className="bg-slate-50 px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-7 animate-fade-in-up">
          <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900 sm:text-[28px]">
            Report an Issue
          </h1>
          <p className="mt-1.5 text-[14px] text-slate-500">
            Takes under a minute. No account needed.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          {/* Category */}
          <div>
            <Label>Category</Label>
            <div className="grid grid-cols-2 overflow-hidden rounded-[3px] border border-slate-200 sm:grid-cols-4" style={{ gap: "1px", background: "#E2E8F0" }}>
              {CATEGORIES.map((c) => {
                const Icon = categoryIcon(c.slug);
                const active = category === c.slug;
                return (
                  <button
                    type="button" key={c.slug} onClick={() => setCategory(c.slug)}
                    className={"flex items-center gap-2 px-3 py-3 text-left transition-colors sm:gap-2.5 sm:px-4 sm:py-3.5 " +
                      (active ? "border-l-[3px] border-l-brand-600 bg-brand-50" : "bg-white hover:bg-slate-50")}
                  >
                    <div className={"flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm border sm:h-7 sm:w-7 " +
                      (active ? "border-brand-200 bg-brand-100" : "border-slate-200 bg-slate-50")}>
                      <Icon className={"h-3 w-3 sm:h-3.5 sm:w-3.5 " + (active ? "text-brand-600" : "text-slate-500")} />
                    </div>
                    <span className={"text-[11px] font-medium leading-tight sm:text-[12px] " +
                      (active ? "font-semibold text-brand-600" : "text-slate-600")}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-[3px] border border-slate-200 bg-white p-4 pb-0 sm:p-5 sm:pb-0">
            <Label htmlFor="desc">Describe the Issue</Label>
            <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Large pothole in the middle of the road, about 30cm wide. Hard to see at night."
              className="border-none px-0 focus:ring-0" />
          </div>

          {/* Photo + Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Photo <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span></Label>
              <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickFile} />
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="preview" className="h-[110px] w-full rounded-[3px] object-cover sm:h-[120px]" />
                  <button type="button" onClick={clearPhoto} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-opacity hover:opacity-80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInput.current?.click()}
                  className="flex h-[110px] w-full flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-600 sm:h-[120px]">
                  <Camera className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" />
                  <span className="text-[12px] font-medium sm:text-[13px]">Take or upload a photo</span>
                  <span className="text-[11px] text-slate-300">Max 8 MB</span>
                </button>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="mb-0">Location</Label>
                <button type="button" onClick={() => locate(true)} disabled={locating}
                  className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:px-3 sm:text-[12px]">
                  {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3 text-slate-500" />}
                  Use GPS
                </button>
              </div>
              <LocationMap value={coords} onChange={setCoords}
                className="h-[110px] w-full overflow-hidden rounded-[3px] border border-slate-200 sm:h-[120px]" />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 sm:text-[12px]">
            {coords
              ? `Pinned at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} — drag the pin to adjust.`
              : "Tap the map to drop a pin, or use your GPS."}
          </p>

          {/* Barangay + Landmark */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="brgy">Barangay</Label>
              <Select id="brgy" value={barangay} onChange={(e) => setBarangay(e.target.value)}>
                <option value="">Select barangay…</option>
                {BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="addr">Nearest Landmark <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span></Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. beside the public market" />
            </div>
          </div>

          {/* Contact */}
          <div>
            <Label htmlFor="contact">Your Contact <span className="normal-case font-normal tracking-normal text-slate-400">(optional)</span></Label>
            <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number or email address" />
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-[3px] border border-brand-200 bg-brand-50 px-4 py-3">
              <p className="text-[13px] text-brand-700">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full transition-transform active:scale-[0.99]" disabled={submitting}>
            {submitting && <Spinner className="h-5 w-5" />}
            {submitting ? "Submitting…" : "Submit Report"}
          </Button>
          <p className="text-center text-[11px] text-slate-400">
            You will receive a reference number to track your report's progress.
          </p>
        </form>
      </div>
    </div>
  );
}

function SuccessCard({ result }: { result: SubmitResult }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-slate-50 px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[480px]">
        <div className="rounded-md border border-slate-200 bg-white p-6 text-center animate-fade-in-up sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 sm:h-14 sm:w-14" />
          <h1 className="mt-4 font-serif text-[22px] font-bold text-slate-900 sm:text-[24px]">
            Report submitted!
          </h1>
          <p className="mt-2 text-[14px] text-slate-500">Save your reference number to track progress.</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <code className="rounded-[3px] bg-slate-100 px-3 py-2 font-mono text-[15px] font-bold tracking-[0.04em] sm:px-4 sm:text-[18px]">
              {result.reference_number}
            </code>
            <Button variant="outline" size="sm"
              onClick={() => { navigator.clipboard.writeText(result.reference_number); setCopied(true); }}>
              <Copy className="h-4 w-4" />{copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link to={`/track/${result.reference_number}`} className="flex-1">
              <Button className="w-full">Track this report</Button>
            </Link>
            <Link to="/report" className="flex-1" onClick={() => window.location.reload()}>
              <Button variant="outline" className="w-full">Report another</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
