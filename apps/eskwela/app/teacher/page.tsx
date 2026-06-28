"use client";

import { useState } from "react";
import Link from "next/link";

type Phase = "idle" | "loading" | "sent" | "error";

const ADMIN_URL = "https://bantay-binan.buildwithanthony.com/admin";

export default function TeacherPage() {
  const [phase, setPhase]   = useState<Phase>("idle");
  const [ref,   setRef]     = useState<string | null>(null);

  async function triggerEmergency() {
    if (phase === "loading" || phase === "sent") return;
    setPhase("loading");
    try {
      const res = await fetch("/api/incidents", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRef(data.reference_number);
      setPhase("sent");
    } catch {
      setPhase("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
        <Link href="/" className="text-[12px] text-[#737373] hover:text-[#ededed] transition-colors">
          ← Bantay Eskwela
        </Link>
        <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#737373]">
          Teacher Terminal
        </span>
        <a
          href={ADMIN_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] text-[#737373] hover:text-[#ededed] transition-colors"
        >
          Admin →
        </a>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Context card */}
        <div className="w-full max-w-sm mb-10 rounded-lg border border-[#1e1e1e] bg-[#111] overflow-hidden animate-fade_in">
          <div className="px-5 py-3 border-b border-[#1e1e1e]">
            <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#404040]">
              Reporter Information
            </span>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {[
              { label: "School",    value: "Biñan National High School" },
              { label: "Building", value: "B"                          },
              { label: "Room",     value: "204"                        },
              { label: "Teacher",  value: "Mrs. Santos"                },
              { label: "Type",     value: "Security Threat"            },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-[12px] text-[#737373]">{r.label}</span>
                <span className="text-[13px] font-medium text-[#ededed]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency button */}
        <div className="relative flex items-center justify-center animate-fade_in" style={{ animationDelay: "80ms" }}>
          {phase === "sent" && (
            <>
              <div className="absolute h-64 w-64 rounded-full bg-[#ef4444]/15 animate-ping" style={{ animationDuration: "1.6s" }} />
              <div className="absolute h-48 w-48 rounded-full bg-[#ef4444]/10 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
            </>
          )}

          <button
            onClick={triggerEmergency}
            disabled={phase === "loading" || phase === "sent"}
            className={[
              "relative z-10 flex h-44 w-44 flex-col items-center justify-center rounded-full font-bold transition-all",
              "focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-offset-[#0a0a0a] focus:ring-[#ef4444]",
              phase === "sent"
                ? "bg-[#ef4444] text-white cursor-default scale-[0.97] shadow-[0_0_70px_rgba(239,68,68,0.5)]"
                : phase === "loading"
                ? "bg-[#7f1d1d] text-white/60 cursor-wait scale-[0.98]"
                : "bg-[#ef4444] text-white hover:bg-[#dc2626] hover:scale-[0.98] active:scale-[0.95] shadow-[0_0_50px_rgba(239,68,68,0.35)]",
            ].join(" ")}
          >
            <span className="text-[32px] mb-1.5">🚨</span>
            <span className="text-[14px] font-bold tracking-[0.08em]">
              {phase === "loading" ? "SENDING…" : phase === "sent" ? "SENT" : "EMERGENCY"}
            </span>
          </button>
        </div>

        {/* Status area */}
        <div className="mt-10 w-full max-w-sm text-center animate-fade_in" style={{ animationDelay: "120ms" }}>
          {phase === "idle" && (
            <p className="text-[13px] text-[#404040]">
              Press to immediately alert school admin, DRRMO, and LGU
            </p>
          )}

          {phase === "loading" && (
            <p className="text-[13px] text-[#737373] animate-pulse">
              Sending emergency alert…
            </p>
          )}

          {phase === "sent" && (
            <div className="space-y-4">
              <p className="text-[16px] font-bold text-[#ef4444]">Emergency Alert Sent</p>
              <p className="text-[13px] text-[#737373]">
                DRRMO and school admin have been notified. Help is on the way.
              </p>

              {ref && (
                <div className="rounded-md border border-[#1e1e1e] bg-[#111] px-4 py-3">
                  <p className="text-[10px] text-[#404040] mb-1 uppercase tracking-wider">Report Reference</p>
                  <p className="font-mono text-[13px] font-semibold text-[#ededed]">{ref}</p>
                </div>
              )}

              <div className="pt-1 space-y-2">
                <p className="text-[11px] text-[#404040]">
                  Notifications sent to:
                </p>
                <div className="flex flex-col gap-1.5 text-[12px]">
                  {[
                    "Telegram — DRRMO Biñan",
                    "Bantay Biñan Admin Dashboard",
                    "City Hall — LGU Biñan",
                  ].map((n) => (
                    <div key={n} className="flex items-center gap-2 text-[#737373]">
                      <span className="text-[#22c55e]">✓</span>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-3">
              <p className="text-[13px] text-[#ef4444]">
                Failed to send alert. Please call emergency contacts directly.
              </p>
              <button
                onClick={() => setPhase("idle")}
                className="text-[12px] text-[#737373] underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Emergency contacts footer */}
      <footer className="border-t border-[#1e1e1e] px-6 py-4">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[11px] text-[#404040]">
          <span>City Emergency: <strong className="text-[#737373]">911</strong></span>
          <span>DRRMO Biñan: <strong className="text-[#737373]">(049) 511-9000</strong></span>
          <span>Biñan PNP: <strong className="text-[#737373]">(049) 511-4444</strong></span>
        </div>
      </footer>
    </main>
  );
}
