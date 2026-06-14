import { STATUS_LABELS, type ReportStatus } from "@bantay/shared";
import { Badge } from "./ui";
import { cn } from "@/lib/utils";

const styles: Record<ReportStatus, { badge: string; dot: string }> = {
  open:        { badge: "bg-slate-50 border-slate-300 text-slate-600",  dot: "bg-slate-400" },
  assigned:    { badge: "bg-amber-50 border-amber-300 text-amber-800",  dot: "bg-amber-400" },
  in_progress: { badge: "bg-blue-50 border-blue-300 text-blue-800",     dot: "bg-blue-500"  },
  resolved:    { badge: "bg-green-50 border-green-300 text-green-800",  dot: "bg-green-500" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as ReportStatus;
  const st = styles[s] ?? styles.open;
  return (
    <Badge className={cn(st.badge, className)}>
      <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", st.dot)} />
      {STATUS_LABELS[s] ?? status}
    </Badge>
  );
}
