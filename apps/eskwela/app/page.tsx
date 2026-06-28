import Link from "next/link";

const ADMIN_URL = "https://bantay-binan.buildwithanthony.com/admin";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2.5">
          <div className="h-[7px] w-[7px] rounded-full bg-[#ef4444] animate-blink" />
          <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#737373]">
            Bantay Eskwela
          </span>
        </div>
        <span className="text-[11px] text-[#404040]">
          City Government of Biñan, Laguna
        </span>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#262626] bg-[#111] px-3.5 py-1.5 animate-fade_in">
          <div className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
          <span className="text-[11px] font-medium text-[#737373] tracking-wide">
            School Emergency Response — Integrated with Bantay Biñan
          </span>
        </div>

        <h1
          className="mt-6 text-[52px] font-bold leading-[1.05] tracking-[-0.035em] text-[#ededed] animate-fade_in sm:text-[72px]"
          style={{ animationDelay: "60ms" }}
        >
          One Press.
          <br />
          <span className="text-[#ef4444]">Immediate</span>
          <br />
          Response.
        </h1>

        <p
          className="mt-6 max-w-[440px] text-[16px] leading-[1.7] text-[#737373] animate-fade_in"
          style={{ animationDelay: "120ms" }}
        >
          Teacher triggers an alert. DRRMO, LGU, and the Bantay Biñan admin
          dashboard are notified instantly — no calls, no delays.
        </p>

        <div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row animate-fade_in"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            href="/teacher"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[#ef4444] px-7 text-[14px] font-semibold text-white transition-all hover:bg-[#dc2626] active:scale-[0.97]"
          >
            Open Teacher Page
          </Link>
          <a
            href={ADMIN_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-[#262626] bg-[#111] px-6 text-[14px] font-medium text-[#ededed] transition-all hover:border-[#404040] hover:bg-[#161616] active:scale-[0.98]"
          >
            Bantay Biñan Dashboard ↗
          </a>
        </div>

        {/* Flow */}
        <div
          className="mt-20 w-full max-w-2xl grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#1e1e1e] bg-[#1e1e1e] text-left sm:grid-cols-4 animate-fade_in"
          style={{ animationDelay: "240ms" }}
        >
          {[
            { n: "01", label: "Teacher presses button",        sub: "One tap — no login required" },
            { n: "02", label: "Report created in Bantay Biñan", sub: "Auto-routed to DRRMO"        },
            { n: "03", label: "Telegram alert fires",           sub: "LGU & admin notified"        },
            { n: "04", label: "Admin opens dashboard",          sub: "Sees report, responds"       },
          ].map((s) => (
            <div key={s.n} className="bg-[#111] px-5 py-5">
              <div className="mb-2 font-mono text-[10px] text-[#404040]">{s.n}</div>
              <div className="mb-0.5 text-[13px] font-semibold text-[#ededed] leading-snug">{s.label}</div>
              <div className="text-[11px] text-[#404040]">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#1e1e1e] px-6 py-4 text-center">
        <p className="text-[11px] text-[#404040]">
          Bantay Eskwela — School Emergency Response · Powered by Bantay Biñan · Biñan, Laguna
        </p>
      </footer>
    </main>
  );
}
