import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CATEGORIES,
  BARANGAYS,
  reportSubmissionSchema,
  type CategorySlug,
} from "@bantay/shared";
import {
  Camera,
  Crosshair,
  CheckCircle2,
  Copy,
  Loader2,
  X,
} from "lucide-react";
import { Button, Card, CardBody, Input, Label, Select, Textarea, Spinner } from "@/components/ui";
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

  // Try to grab location on first load (non-blocking).
  useEffect(() => {
    locate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate(explicit: boolean) {
    if (!navigator.geolocation) {
      if (explicit) setError("Your device doesn't support location. Tap the map to set it.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        if (explicit) setError("Couldn't get your location. Tap the map to set it manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setError("Photo is larger than 8 MB. Please choose a smaller one.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  function clearPhoto() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      category,
      description: description.trim(),
      barangay,
      latitude: coords?.lat ?? NaN,
      longitude: coords?.lng ?? NaN,
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
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <SuccessCard result={result} />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Report an issue</h1>
      <p className="mt-1 text-slate-600">Takes under a minute. No account needed.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        {/* Category */}
        <div>
          <Label>Category</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const Icon = categoryIcon(c.slug);
              const active = category === c.slug;
              return (
                <button
                  type="button"
                  key={c.slug}
                  onClick={() => setCategory(c.slug)}
                  className={
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors " +
                    (active
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                  }
                >
                  <Icon className="h-6 w-6" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="desc">Describe the issue</Label>
          <Textarea
            id="desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Large pothole in the middle of the road, hard to see at night."
          />
        </div>

        {/* Photo */}
        <div>
          <Label>Photo (optional)</Label>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPickFile}
          />
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="preview" className="h-44 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600"
            >
              <Camera className="h-7 w-7" />
              <span className="text-sm">Take or upload a photo</span>
            </button>
          )}
        </div>

        {/* Location */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="mb-0">Location</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => locate(true)}
              disabled={locating}
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              Use my location
            </Button>
          </div>
          <LocationMap
            value={coords}
            onChange={setCoords}
            className="h-56 w-full overflow-hidden rounded-xl border border-slate-200"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {coords
              ? `Pinned at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} — drag the pin to adjust.`
              : "Tap the map to drop a pin, or use your GPS."}
          </p>
        </div>

        {/* Barangay + landmark */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brgy">Barangay</Label>
            <Select id="brgy" value={barangay} onChange={(e) => setBarangay(e.target.value)}>
              <option value="">Select barangay…</option>
              {BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="addr">Nearest landmark (optional)</Label>
            <Input
              id="addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. beside the public market"
            />
          </div>
        </div>

        {/* Contact */}
        <div>
          <Label htmlFor="contact">Your contact (optional)</Label>
          <Input
            id="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email, if the office needs to follow up"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Spinner className="h-5 w-5" />}
          {submitting ? "Submitting…" : "Submit report"}
        </Button>
      </form>
    </div>
  );
}

function SuccessCard({ result }: { result: SubmitResult }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardBody className="text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold">Report submitted!</h1>
          <p className="mt-1 text-slate-600">
            Save your reference number to track progress.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <code className="rounded-xl bg-slate-100 px-4 py-2 text-lg font-bold tracking-wide">
              {result.reference_number}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(result.reference_number);
                setCopied(true);
              }}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link to={`/track/${result.reference_number}`} className="flex-1">
              <Button className="w-full">Track this report</Button>
            </Link>
            <Link to="/report" className="flex-1" onClick={() => window.location.reload()}>
              <Button variant="outline" className="w-full">
                Report another
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
