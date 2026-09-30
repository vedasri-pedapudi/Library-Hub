import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, Inbox, Search } from "lucide-react";
import { useLibrary } from "@/services/store";
import { getLoanStatus, LOAN_STATUS_LABEL } from "@/services/loanRules";
import type { LoanStatus } from "@/services/types";
import { LoanList } from "@/features/loans/LoanList";
import { useIssueDialog } from "@/features/loans/IssueLoanDialog";
import { EmptyState, PageHeader } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/manage/loans")({
  head: () => ({ meta: [{ title: "Loans | PageNest" }] }),
  component: LoansPage,
});

type Filter = "OPEN" | LoanStatus | "ALL";
const FILTERS: Filter[] = ["OPEN", "OVERDUE", "DUE_SOON", "ACTIVE", "RENEWED", "RETURNED", "ALL"];

function LoansPage() {
  const { data } = useLibrary();
  const { open: openIssue } = useIssueDialog();
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(40);
  const books = new Map(data.books.map((b) => [b.id, b]));
  const members = new Map(data.members.map((m) => [m.id, m]));

  const withStatus = useMemo(() => data.loans.map((l) => ({ loan: l, status: getLoanStatus(l) })), [data.loans]);
  const matches = (f: Filter, s: LoanStatus) => f === "ALL" || (f === "OPEN" ? s !== "RETURNED" : s === f);
  const rows = withStatus
    .filter(({ loan, status }) => {
      if (!matches(filter, status)) return false;
      const term = q.trim().toLowerCase();
      if (!term) return true;
      return `${loan.id} ${books.get(loan.bookId)?.title ?? ""} ${members.get(loan.memberId)?.name ?? ""}`.toLowerCase().includes(term);
    })
    .sort((a, b) => (filter === "RETURNED" || filter === "ALL" ? b.loan.borrowedAt.localeCompare(a.loan.borrowedAt) : a.loan.dueDate.localeCompare(b.loan.dueDate)))
    .map((r) => r.loan);

  return (
    <>
      <PageHeader eyebrow="Circulation" title="Loan Management" description="Issue, return and renew books. Statuses update automatically from due dates." actions={<Button onClick={() => openIssue()}><ArrowRightLeft aria-hidden="true" /> Issue book</Button>} />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by loan ID, book or member…" className="h-11 rounded-full pl-10" aria-label="Search loans" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => { setFilter(f); setLimit(40); }} aria-pressed={filter === f} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", filter === f ? "border-gold bg-gold/10 text-gold-soft" : "border-border text-muted-foreground hover:text-ivory")}>
              {f === "OPEN" ? "All open" : f === "ALL" ? "Everything" : LOAN_STATUS_LABEL[f]} <span className="opacity-60">{withStatus.filter((r) => matches(f, r.status)).length}</span>
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? <EmptyState icon={Inbox} title="No loans match" /> : (
        <>
          <LoanList loans={rows.slice(0, limit)} mode="staff" />
          {rows.length > limit && <div className="mt-6 text-center"><Button variant="outline" onClick={() => setLimit((l) => l + 40)}>Show more ({rows.length - limit} remaining)</Button></div>}
        </>
      )}
    </>
  );
}
