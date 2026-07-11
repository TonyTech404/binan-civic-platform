"use client";

import * as React from "react";

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

export function FeatureCards() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-3">
      {FEATURES.map((f, i) => (
        // Outer element owns the staggered scroll-reveal (opacity + rise).
        <div
          key={f.title}
          style={{ transitionDelay: `${i * 120}ms` }}
          className={
            "transition-all duration-[600ms] ease-out " +
            (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")
          }
        >
          {/* Inner element owns the hover lift (kept separate so it isn't
              delayed by the reveal's transition-delay). */}
          <div className="group h-full rounded-lg border border-slate-200 bg-white p-6 transition duration-200 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">
              {f.tag}
            </span>
            <h3 className="mt-2.5 font-serif text-[18px] font-bold text-slate-900">
              {f.title}
            </h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-slate-600">{f.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
