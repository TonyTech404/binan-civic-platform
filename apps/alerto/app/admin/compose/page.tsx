"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin, supabase } from "@/components/admin/ctx";
import { can } from "@/lib/rbac";
import { Button, Card, Input, Textarea, Select, Label, Spinner, Badge } from "@/components/ui";
import { CATEGORIES, CATEGORY_LABEL, SEVERITIES, SEVERITY_LABEL, SEVERITY_STYLE } from "@/components/admin/styles";

type Brgy = { id: string; name: string; is_riverside: boolean };

export default function Compose() {
  const { role, authFetch, barangayId, barangayName } = useAdmin();
  const scoped = !!barangayId; // barangay-scoped staff can only send to their barangay
  const router = useRouter();

  const [barangays, setBarangays] = React.useState<Brgy[]>([]);
  const [category, setCategory] = React.useState("advisory");
  const [severity, setSeverity] = React.useState("warning");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [scope, setScope] = React.useState<"city" | "barangays">("city");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ id: string; delivered_count: number; failed_count: number; recipients_total: number } | null>(null);

  React.useEffect(() => {
    supabase().from("alerto_barangays").select("id,name,is_riverside").order("name")
      .then(({ data }) => setBarangays((data ?? []) as Brgy[]));
  }, []);

  if (!can(role, "alerts:send")) {
    return <p className="py-20 text-center text-[14px] text-slate-500">Wala kang permiso para magpadala ng alerto.</p>;
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function send() {
    setError(null);
    if (!title.trim() || !body.trim()) return setError("Kailangan ang pamagat at mensahe.");
    if (!scoped && scope === "barangays" && selected.size === 0) return setError("Pumili ng kahit isang barangay.");

    setSending(true);
    const res = await authFetch("/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        title, body, category, severity,
        // Scoped staff always send to their own barangay (server re-enforces this).
        target_scope: scoped ? "barangays" : scope,
        barangay_ids: scoped ? [barangayId] : scope === "barangays" ? [...selected] : [],
      }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Hindi naipadala ang alerto.");
    setResult(data);
  }

  if (result) {
    return (
      <div className="mx-auto max-w-[520px] py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">📨</div>
        <h1 className="font-serif text-[24px] font-bold text-slate-900">Naipadala ang alerto</h1>
        <p className="mt-2 text-[14px] text-slate-600">
          Naabot ang <b className="font-mono">{result.delivered_count}</b> na subscriber
          {result.failed_count > 0 && <> · <span className="text-brand-600">{result.failed_count} bigo</span></>}
          {" "}(sa kabuuang {result.recipients_total}).
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/admin/alerts/${result.id}`}>
            <Button variant="outline">Tingnan ang detalye</Button>
          </Link>
          <Button onClick={() => { setResult(null); setTitle(""); setBody(""); setSelected(new Set()); }}>
            Magpadala ng bago
          </Button>
        </div>
      </div>
    );
  }

  const riversideCount = barangays.filter((b) => b.is_riverside).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Magpadala ng Alerto</h1>
        <p className="mt-1 text-[14px] text-slate-500">Bumuo ng mensahe at piliin kung sino ang makakatanggap.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <div className="space-y-5 lg:col-span-3">
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategorya</Label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </Select>
              </div>
              <div>
                <Label>Antas (Severity)</Label>
                <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label>Pamagat</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hal. Kritikal na antas ng tubig sa ilog" maxLength={120} />
            </div>
            <div className="mt-4">
              <Label>Mensahe</Label>
              <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ilarawan ang sitwasyon at ang dapat gawin ng residente…" maxLength={900} />
              <div className="mt-1 text-right font-mono text-[11px] text-slate-400">{body.length}/900</div>
            </div>
          </Card>

          {/* Targeting */}
          <Card className="p-5">
            <Label>Sino ang makakatanggap?</Label>

            {scoped ? (
              // Barangay-scoped staff: target is locked to their barangay.
              <div className="flex items-center gap-3 rounded-md border border-brand-200 bg-brand-50 px-4 py-3">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-[13px] font-bold text-brand-700">Barangay {barangayName}</div>
                  <div className="text-[11.5px] text-brand-700/80">Ipapadala lang sa mga subscriber ng iyong barangay.</div>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-3">
              <ScopeButton active={scope === "city"} onClick={() => setScope("city")} title="Buong Lungsod" desc="Lahat ng active subscriber" />
              <ScopeButton active={scope === "barangays"} onClick={() => setScope("barangays")} title="Piling Barangay" desc="Piliin ang mga apektadong lugar" />
            </div>
            )}

            {!scoped && scope === "barangays" && (
              <div className="mt-4">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <button onClick={() => setSelected(new Set(barangays.map((b) => b.id)))} className="rounded border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Piliin lahat</button>
                  <button onClick={() => setSelected(new Set(barangays.filter((b) => b.is_riverside).map((b) => b.id)))} className="rounded border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Riverside ({riversideCount})</button>
                  <button onClick={() => setSelected(new Set())} className="rounded border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">I-clear</button>
                  <span className="ml-auto text-[12px] text-slate-400">{selected.size} napili</span>
                </div>
                <div className="grid max-h-[240px] grid-cols-2 gap-1.5 overflow-y-auto rounded border border-slate-100 p-2 sm:grid-cols-3">
                  {barangays.map((b) => {
                    const on = selected.has(b.id);
                    return (
                      <button key={b.id} onClick={() => toggle(b.id)}
                        className={"flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-[12px] transition-colors " + (on ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100")}>
                        <span className={"flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] " + (on ? "border-white bg-white text-brand-600" : "border-slate-300")}>{on ? "✓" : ""}</span>
                        <span className="truncate">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {error && <p className="text-[13px] font-medium text-brand-600">{error}</p>}
          <Button size="lg" onClick={send} disabled={sending} className="w-full">
            {sending && <Spinner className="h-5 w-5" />}
            {sending ? "Ipinapadala…" : "Ipadala ang Alerto"}
          </Button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <Label>Preview (Telegram)</Label>
            <div className="rounded-xl border border-slate-200 bg-[#e7ebf0] p-4">
              <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-white p-3.5 shadow-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge className={SEVERITY_STYLE[severity]}>{severity}</Badge>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Bantay Biñan</span>
                </div>
                <div className="text-[14px] font-bold text-slate-900">{title || "Pamagat ng alerto"}</div>
                <div className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.5] text-slate-700">{body || "Lalabas dito ang iyong mensahe…"}</div>
                <div className="mt-2 text-[11px] italic text-slate-400">Opisyal na abiso mula sa Pamahalaang Lungsod ng Biñan.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScopeButton({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick}
      className={"rounded-md border p-3 text-left transition-all " + (active ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300")}>
      <div className={"text-[13px] font-bold " + (active ? "text-brand-700" : "text-slate-900")}>{title}</div>
      <div className="mt-0.5 text-[11.5px] text-slate-500">{desc}</div>
    </button>
  );
}
