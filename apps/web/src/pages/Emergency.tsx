import { EMERGENCY_CONTACTS } from "@bantay/shared";
import { Phone, Flame, Shield, HeartPulse, CloudRain, Building2, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  emergency: AlertTriangle,
  fire: Flame,
  police: Shield,
  medical: HeartPulse,
  disaster: CloudRain,
  general: Building2,
};

export function Emergency() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Emergency Hotlines</h1>
      <p className="mt-1 text-slate-600">
        For life-threatening emergencies, call <strong>911</strong> immediately. Bantay Biñan is for
        non-urgent community issues.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {EMERGENCY_CONTACTS.map((c) => {
          const Icon = ICONS[c.type] ?? Phone;
          return (
            <a key={c.name} href={`tel:${c.number.replace(/[^\d+]/g, "")}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-brand-700">{c.number}</p>
                  </div>
                </CardBody>
              </Card>
            </a>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Hotline numbers are indicative — confirm against official City of Biñan advisories.
      </p>
    </div>
  );
}
