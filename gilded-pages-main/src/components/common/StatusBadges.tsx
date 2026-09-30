import { AlertTriangle, BookmarkCheck, CheckCircle2, Clock, Ban, RefreshCw, BookOpen } from "lucide-react";
import type { LoanStatus } from "@/services/types";
import type { Availability } from "@/services/loanRules";
import { LOAN_STATUS_LABEL } from "@/services/loanRules";
import { cn } from "@/lib/utils";

const pill = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors duration-300";

const AVAILABILITY: Record<Availability, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  AVAILABLE: { label: "Available", cls: "border-success/30 bg-success/10 text-success", Icon: CheckCircle2 },
  BORROWED: { label: "Borrowed", cls: "border-warning/30 bg-warning/10 text-warning", Icon: BookOpen },
  RESERVED: { label: "Reserved", cls: "border-info/30 bg-info/10 text-info", Icon: BookmarkCheck },
  UNAVAILABLE: { label: "Unavailable", cls: "border-border bg-muted/50 text-muted-foreground", Icon: Ban },
};

export function AvailabilityBadge({ status, className, copies }: { status: Availability; className?: string; copies?: number }) {
  const { label, cls, Icon } = AVAILABILITY[status];
  return (
    <span className={cn(pill, cls, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
      {status === "AVAILABLE" && copies !== undefined && <span className="opacity-75">· {copies}</span>}
    </span>
  );
}

const LOAN: Record<LoanStatus, { cls: string; Icon: typeof Clock }> = {
  ACTIVE: { cls: "border-border bg-secondary/60 text-foreground", Icon: BookOpen },
  RENEWED: { cls: "border-info/30 bg-info/10 text-info", Icon: RefreshCw },
  DUE_SOON: { cls: "border-warning/35 bg-warning/10 text-warning", Icon: Clock },
  OVERDUE: { cls: "border-danger/40 bg-danger/12 text-danger", Icon: AlertTriangle },
  RETURNED: { cls: "border-success/30 bg-success/10 text-success", Icon: CheckCircle2 },
};

export function LoanStatusBadge({ status, className }: { status: LoanStatus; className?: string }) {
  const { cls, Icon } = LOAN[status];
  return (
    <span className={cn(pill, cls, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {LOAN_STATUS_LABEL[status]}
    </span>
  );
}
