import { STATUS_LABELS, type ReportStatus } from "@bantay/shared";
import { Badge } from "./ui";
import { cn } from "@/lib/utils";

const styles: Record<ReportStatus, string> = {
  open: "bg-slate-100 text-slate-700",
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as ReportStatus;
  return (
    <Badge className={cn(styles[s] ?? "bg-slate-100 text-slate-700", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[s] ?? status}
    </Badge>
  );
}
