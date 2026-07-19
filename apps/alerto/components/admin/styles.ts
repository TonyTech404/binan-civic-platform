// Shared badge/pill styles for severities, alert statuses, and categories.

export const SEVERITY_STYLE: Record<string, string> = {
  info:     "border-slate-200 bg-slate-50 text-slate-600",
  advisory: "border-sky-200 bg-sky-50 text-sky-700",
  warning:  "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-brand-200 bg-brand-50 text-brand-700",
};

export const STATUS_STYLE: Record<string, string> = {
  draft:            "border-slate-200 bg-slate-50 text-slate-500",
  pending_approval: "border-violet-200 bg-violet-50 text-violet-700",
  rejected:         "border-rose-200 bg-rose-50 text-rose-700",
  sending:          "border-amber-200 bg-amber-50 text-amber-700",
  sent:             "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed:           "border-brand-200 bg-brand-50 text-brand-700",
};

export const STATUS_LABEL: Record<string, string> = {
  draft:            "Draft",
  pending_approval: "Naghihintay ng approval",
  rejected:         "Tinanggihan",
  sending:          "Ipinapadala",
  sent:             "Naipadala",
  failed:           "Bigo",
};

export const CATEGORY_LABEL: Record<string, string> = {
  flood:        "Baha",
  weather:      "Panahon",
  brownout:     "Brownout",
  advisory:     "Adbaysori",
  health:       "Kalusugan",
  security:     "Seguridad",
  announcement: "Anunsyo",
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL);
export const SEVERITIES = ["info", "advisory", "warning", "critical"] as const;

export const SEVERITY_LABEL: Record<string, string> = {
  info: "Paalala",
  advisory: "Adbaysori",
  warning: "Babala",
  critical: "Kritikal",
};
