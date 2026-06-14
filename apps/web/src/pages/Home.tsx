import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "@bantay/shared";
import { Search } from "lucide-react";
import { categoryIcon } from "@/components/category";

// ── Scroll-reveal wrapper ─────────────────────────────────────
// Uses CSS transitions on opacity + transform (compositor-only, no reflow).
// IntersectionObserver fires once then disconnects.
function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.55s ease-out ${delay}ms, transform 0.55s ease-out ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────
// Fires once when element enters viewport. Skips if value has no digits.
function CountUp({ value }: { value: string }) {
  const match = value.match(/^([^\d]*)(\d+)([^\d]*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!match) return;
    const el = ref.current;
    if (!el) return;
    const end = parseInt(match[2], 10);
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const duration = 1000;
        const startTime = performance.now();
        function tick(now: number) {
          const t = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
          setDisplay(String(Math.round(eased * end)));
          if (t < 1) requestAnimationFrame(tick);
          else setDisplay(match![2]);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // eslint-disable-line

  if (!match) return <>{value}</>;
  return <span ref={ref}>{match[1]}{display}{match[3]}</span>;
}

// ── Page data ─────────────────────────────────────────────────
const STATS = [
  { value: "156",  label: "Issues resolved"   },
  { value: "23",   label: "Active reports"     },
  { value: "24",   label: "Barangays covered"  },
  { value: "<48h", label: "Avg. response time" },
];

const STEPS = [
  { n: "01", title: "Pin the location", body: "Snap a photo and drop a pin where the problem is. No account needed." },
  { n: "02", title: "We route it",       body: "Your report goes straight to the responsible city office. Automatically." },
  { n: "03", title: "Track the fix",     body: "Follow progress and see before-and-after proof when it's resolved." },
];

export function Home() {
  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-forest-700 px-4 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* Left: copy */}
          <div>
            <div
              className="mb-6 flex items-center gap-2.5 animate-fade-in-up"
              style={{ animationDelay: "0ms" }}
            >
              <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-brand-600" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
                Official Community Issue Reporting
              </span>
            </div>

            <h1
              className="mb-5 font-serif text-[40px] font-bold leading-[1.06] tracking-[-0.025em] text-white animate-fade-in-up sm:text-[52px] lg:text-[60px]"
              style={{ animationDelay: "80ms" }}
            >
              See it.<br />Report it.<br />
              <em className="text-gold-400 not-italic">Fix it.</em>
            </h1>

            <p
              className="mb-8 text-[15px] font-normal leading-[1.75] text-white animate-fade-in-up sm:mb-10 sm:text-[16px] lg:max-w-[400px]"
              style={{ animationDelay: "160ms" }}
            >
              Report potholes, flooding, broken streetlights, and other community
              issues directly to the right city office — and track the fix from
              start to finish.
            </p>

            <div
              className="flex flex-wrap gap-3 animate-fade-in-up"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                to="/report"
                className="inline-flex h-[48px] items-center gap-2.5 rounded bg-brand-600 px-6 text-[14px] font-semibold tracking-[0.01em] text-white transition-all hover:bg-brand-700 hover:-translate-y-px hover:shadow-md active:scale-[0.97] sm:h-[52px] sm:px-7"
              >
                Report an issue <span className="text-[16px]">→</span>
              </Link>
              <Link
                to="/track"
                className="inline-flex h-[48px] items-center gap-2 rounded border border-white/25 bg-transparent px-5 text-[14px] font-medium text-white transition-all hover:bg-white/10 hover:-translate-y-px active:scale-[0.97] sm:h-[52px] sm:px-6"
              >
                <Search className="h-[15px] w-[15px] text-white/60" />
                Track a report
              </Link>
            </div>
          </div>

          {/* Right: stats panel — numbers count up when they enter view */}
          <div
            className="grid grid-cols-2 overflow-hidden rounded-md animate-fade-in"
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              animationDelay: "200ms",
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="px-5 py-6 sm:px-7 sm:py-8"
                style={{
                  background:   "rgba(255,255,255,0.05)",
                  borderRight:  i % 2 === 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  borderBottom: i < 2        ? "1px solid rgba(255,255,255,0.07)" : "none",
                }}
              >
                <div className="mb-1.5 font-serif text-[40px] font-bold leading-none text-gold-400 sm:text-[54px]">
                  <CountUp value={s.value} />
                </div>
                <div className="text-[11px] tracking-wide text-white/50 sm:text-[12px]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="border-b border-t border-slate-200 bg-white px-4 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-[1200px]">
          <ScrollReveal>
            <div className="mb-10 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 sm:mb-12">
              How It Works
            </div>
          </ScrollReveal>

          {/* Mobile: vertical steps */}
          <div className="flex flex-col gap-0 lg:hidden">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.n} delay={i * 80} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="font-serif text-[36px] font-bold leading-none text-gold-400">
                    {s.n}
                  </div>
                  {i < 2 && <div className="mt-2 h-full w-px bg-slate-200" style={{ minHeight: 32 }} />}
                </div>
                <div className="pb-8 pt-1">
                  <div className="mb-1.5 font-serif text-[16px] font-semibold text-slate-900">
                    {s.title}
                  </div>
                  <p className="text-[14px] leading-[1.65] text-slate-500">{s.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Desktop: horizontal with arrows */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_56px_1fr_56px_1fr] lg:items-start">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <ScrollReveal delay={i * 100}>
                  <div className="mb-4 font-serif text-[56px] font-bold leading-none text-gold-400">
                    {s.n}
                  </div>
                  <div className="mb-2.5 font-serif text-[17px] font-semibold text-slate-900">
                    {s.title}
                  </div>
                  <p className="text-[14px] leading-[1.7] text-slate-500">{s.body}</p>
                </ScrollReveal>
                {i < 2 && (
                  <div className="flex items-center justify-center" style={{ paddingTop: 28 }}>
                    <div className="relative w-full">
                      <div className="h-px w-full bg-brand-600/40" />
                      <div className="absolute right-[-4px] top-[-4px] h-2 w-2 rotate-45 border-r border-t border-brand-600/40" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────── */}
      <section className="bg-slate-50 px-4 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-[1200px]">
          <ScrollReveal className="mb-7">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600">
              What Can You Report?
            </div>
            <div className="font-serif text-[18px] font-semibold text-slate-900 sm:text-[20px]">
              Select a category to get started
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <div
              className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 sm:grid-cols-4"
              style={{ gap: "1px", background: "#E2E8F0" }}
            >
              {CATEGORIES.map((c) => {
                const Icon = categoryIcon(c.slug);
                return (
                  <Link
                    key={c.slug}
                    to={`/report?category=${c.slug}`}
                    className="group flex items-center gap-3 bg-white px-4 py-4 transition-all duration-150 hover:bg-slate-50 hover:-translate-y-px hover:shadow-sm sm:px-5 sm:py-[20px]"
                  >
                    <div className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 transition-colors group-hover:border-brand-200 group-hover:bg-brand-50 sm:h-[34px] sm:w-[34px]">
                      <Icon className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-brand-600" />
                    </div>
                    <span className="text-[12px] font-medium leading-tight text-slate-700 transition-colors group-hover:text-slate-900 sm:text-[13px]">
                      {c.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
