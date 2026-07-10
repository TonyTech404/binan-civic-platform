import Link from "next/link";
import { Seal } from "@/components/Seal";

const FEATURES = [
  {
    tag: "Lokal",
    title: "Alerto na para sa Biñan",
    body: "Higit pa sa pambansang babala. Makakatanggap ka ng abiso tungkol sa lokal na baha, brownout, at anunsyo ng lungsod.",
  },
  {
    tag: "Per-Barangay",
    title: "Ayon sa iyong lugar",
    body: "Piliin ang iyong barangay. Ipapadala lang namin ang mga alertong may kinalaman sa inyong komunidad.",
  },
  {
    tag: "Opisyal",
    title: "Direkta sa Pamahalaan",
    body: "Bawat mensahe ay mula mismo sa City Government of Biñan Disaster Risk Reduction & Management Office.",
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="h-1 bg-brand-600" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Seal size={34} />
            <span className="font-serif text-[15px] font-bold tracking-[-0.01em] text-slate-900">
              BANTAY BIÑAN
            </span>
            <span className="ml-1 rounded-sm bg-brand-100 px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.12em] text-brand-600">
              Alerto
            </span>
          </div>
          <Link
            href="/admin"
            className="text-[12px] font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            Staff Portal →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-5 pt-16 pb-14 sm:px-8 sm:pt-24">
        <div className="animate-fade-in-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-brand-600 animate-blink" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Emergency & Advisory Alerts
            </span>
          </div>
          <h1 className="max-w-[720px] font-serif text-[38px] font-bold leading-[1.08] tracking-[-0.02em] text-slate-900 sm:text-[54px]">
            Lokal na alerto,{" "}
            <span className="text-brand-600">diretso sa iyo.</span>
          </h1>
          <p className="mt-5 max-w-[560px] text-[16px] leading-[1.6] text-slate-600 sm:text-[17px]">
            Mag-subscribe sa Telegram at makatanggap ng mabilis na abiso tungkol
            sa baha, panahon, brownout, at mga opisyal na anunsyo — na para mismo
            sa iyong barangay sa Biñan, Laguna.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/subscribe"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded bg-brand-600 px-7 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-brand-700 hover:shadow-md"
            >
              Mag-subscribe sa Telegram
            </Link>
            <Link
              href="/subscribe"
              className="inline-flex h-[52px] items-center justify-center rounded border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-px hover:bg-slate-50"
            >
              Paano ito gumagana?
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1120px] px-5 pb-24 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-slate-200 bg-white p-6 transition-shadow hover:shadow-sm"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">
                {f.tag}
              </span>
              <h3 className="mt-2.5 font-serif text-[18px] font-bold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-3 px-5 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
          <p className="text-[12px] text-slate-500">
            City Government of Biñan, Laguna · Disaster Risk Reduction & Management Office
          </p>
          <p className="text-[11px] text-slate-400">
            Prototype — Telegram delivery. SMS coming soon.
          </p>
        </div>
      </footer>
    </main>
  );
}
