import Link from "next/link";
import QRCode from "qrcode";
import { Seal } from "@/components/Seal";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: 1, t: "Buksan ang bot", d: "I-tap ang button o i-scan ang QR code para buksan ang aming Telegram bot." },
  { n: 2, t: "I-tap ang “Start”", d: "Simulan ang usapan sa bot para makapag-rehistro." },
  { n: 3, t: "Piliin ang barangay", d: "I-tap ang iyong barangay mula sa listahan." },
  { n: 4, t: "Tapos na!", d: "Makakatanggap ka na ng mga lokal na alerto. Opsyonal: mag-iwan ng cellphone number para sa SMS backup." },
];

export default async function Subscribe() {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "BantayBinanAlertoBot";
  const link = `https://t.me/${username}?start=web`;
  const qrSvg = await QRCode.toString(link, {
    type: "svg",
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="h-1 bg-brand-600" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Seal size={34} />
            <span className="font-serif text-[15px] font-bold tracking-[-0.01em] text-slate-900">
              BANTAY BIÑAN
            </span>
            <span className="ml-1 rounded-sm bg-brand-100 px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.12em] text-brand-600">
              Alerto
            </span>
          </Link>
          <Link href="/" className="text-[12px] font-semibold text-slate-500 hover:text-slate-900">
            ← Bumalik
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1120px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {/* Left: QR + CTA */}
        <div className="animate-fade-in-up">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
            Mag-subscribe
          </span>
          <h1 className="mt-2 font-serif text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-slate-900 sm:text-[40px]">
            I-scan para simulan
          </h1>
          <p className="mt-3 max-w-[440px] text-[15px] leading-[1.6] text-slate-600">
            I-scan ang QR code gamit ang camera ng iyong telepono, o i-tap ang
            button kung nasa telepono ka na.
          </p>

          <div className="mt-8 inline-block rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div
              className="h-[220px] w-[220px] [&>svg]:h-full [&>svg]:w-full"
              // QR is generated server-side from the Telegram deep link.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <div className="mt-6">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded bg-brand-600 px-7 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-brand-700 hover:shadow-md"
            >
              Buksan sa Telegram
            </a>
            <p className="mt-2.5 font-mono text-[12px] text-slate-400">t.me/{username}</p>
          </div>
        </div>

        {/* Right: steps + consent */}
        <div className="animate-fade-in-up">
          <ol className="space-y-5">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-[13px] font-bold text-white">
                  {s.n}
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-slate-900">{s.t}</div>
                  <p className="mt-0.5 text-[14px] leading-[1.55] text-slate-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-md border-l-[3px] border-l-slate-300 bg-white px-4 py-3.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Privacy
            </div>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-slate-500">
              Sa pag-subscribe, pumapayag ka na makatanggap ng opisyal na alerto
              mula sa Pamahalaang Lungsod ng Biñan. Ang iyong impormasyon ay
              gagamitin lamang para sa pagpapadala ng abiso (Data Privacy Act,
              RA 10173). Maaari kang mag-unsubscribe anumang oras sa pamamagitan
              ng pag-type ng <span className="font-mono">/stop</span>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
