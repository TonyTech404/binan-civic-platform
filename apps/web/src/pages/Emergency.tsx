import { EMERGENCY_CONTACTS } from "@bantay/shared";
import { AlertTriangle, Flame, Shield, HeartPulse, CloudRain, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  emergency: AlertTriangle,
  fire:      Flame,
  police:    Shield,
  medical:   HeartPulse,
  disaster:  CloudRain,
  general:   Building2,
};

export function Emergency() {
  return (
    <div className="bg-slate-50 px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-[900px]">
        <div className="animate-fade-in-up">
          <h1 className="font-serif text-[22px] font-bold text-slate-900 sm:text-[26px]">
            Emergency Hotlines
          </h1>

          <div className="mt-3 mb-7 flex items-start gap-3 rounded-[3px] border border-brand-200 border-l-[3px] border-l-brand-600 bg-brand-50 px-4 py-3.5 sm:items-center">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 sm:mt-0" />
            <p className="text-[13px] leading-[1.5] text-brand-800">
              For life-threatening emergencies, call <strong>911</strong> immediately. Bantay Biñan
              is for non-urgent community issues only.
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-1 overflow-hidden rounded-md border border-slate-200 animate-fade-in-up sm:grid-cols-2"
          style={{ gap: "1px", background: "#E2E8F0", animationDelay: "80ms" }}
        >
          {EMERGENCY_CONTACTS.map((c) => {
            const Icon = ICONS[c.type] ?? AlertTriangle;
            const isEmergency = c.type === "emergency";
            return (
              <a
                key={c.name}
                href={`tel:${c.number.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-4 bg-white px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6 sm:py-5"
              >
                <div className={"flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[3px] border " +
                  (isEmergency ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-slate-50")}>
                  <Icon className={"h-[18px] w-[18px] " + (isEmergency ? "text-brand-600" : "text-slate-500")} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">{c.name}</p>
                  <p className={"font-mono font-bold " +
                    (isEmergency ? "text-[16px] text-brand-600 sm:text-[18px]" : "text-[13px] font-medium text-slate-700 sm:text-[15px]")}>
                    {c.number}
                  </p>
                </div>
              </a>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-slate-400">
          Confirm numbers against official City of Biñan advisories. Numbers shown are indicative.
        </p>
      </div>
    </div>
  );
}
