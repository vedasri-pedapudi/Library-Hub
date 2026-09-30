import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BellRing, Clock, PartyPopper, Timer, Users } from "lucide-react";
import { useLibrary, useLibraryActions } from "@/services/store";
import { dueSoonLoans, overdueLoans } from "@/services/selectors";
import { daysOverdue } from "@/services/loanRules";
import { LoanList } from "@/features/loans/LoanList";
import { ColumnChart, TrendChart } from "@/features/analytics/charts";
import { EmptyState, PageHeader, SectionHeader, StatCard } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { addDays, formatShortDate, startOfDay } from "@/utils/dates";

export const Route = createFileRoute("/_app/overdue")({
  head: () => ({ meta: [{ title: "Overdue | PageNest" }] }),
  component: OverduePage,
});

function OverduePage() {
  const { data } = useLibrary();
  const actions = useLibraryActions();
  const overdue = overdueLoans(data);
  const dueSoon = dueSoonLoans(data);
  const members = new Set(overdue.map((l) => l.memberId));
  const worst = overdue[0] ? daysOverdue(overdue[0]) : 0;
  const worstBook = overdue[0] && data.books.find((b) => b.id === overdue[0]?.bookId);

  const buckets = useMemo(() => {
    const b = [
      { label: "1–3 days", value: 0 },
      { label: "4–7 days", value: 0 },
      { label: "8–14 days", value: 0 },
      { label: "15+ days", value: 0 },
    ];
    for (const l of overdue) {
      const d = daysOverdue(l);
      const i = d <= 3 ? 0 : d <= 7 ? 1 : d <= 14 ? 2 : 3;
      const bucket = b[i];
      if (bucket) bucket.value++;
    }
    return b;
  }, [overdue]);

  // How many loans were overdue at the end of each of the last 21 days.
  const trend = useMemo(() => {
    const today = startOfDay();
    return Array.from({ length: 21 }, (_, i) => {
      const day = addDays(today, i - 20);
      day.setHours(23, 59);
      const t = day.getTime();
      const value = data.loans.filter((l) => new Date(l.borrowedAt).getTime() <= t && new Date(l.dueDate).getTime() < t && (!l.returnedAt || new Date(l.returnedAt).getTime() > t)).length;
      return { label: formatShortDate(day.toISOString()), value };
    });
  }, [data.loans]);

  return (
    <>
      <PageHeader
        eyebrow="Overdue prevention"
        title="Overdue Management"
        description="Loans are marked overdue automatically when today is past the due date and the book hasn't come back."
        actions={overdue.length > 0 && <Button variant="outline" onClick={() => actions.remindMany(overdue.map((l) => l.id))}><BellRing aria-hidden="true" /> Remind all ({overdue.length})</Button>}
      />

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Overdue books" value={overdue.length} icon={AlertTriangle} tone={overdue.length ? "danger" : "success"} />
        <StatCard label="Members affected" value={members.size} icon={Users} tone="warning" />
        <StatCard label="Most overdue (days)" value={worst} icon={Timer} hint={worstBook ? worstBook.title : "—"} />
        <StatCard label="Due in 3 days" value={dueSoon.length} icon={Clock} tone="warning" hint="Will be reminded automatically" />
      </div>

      {overdue.length === 0 ? (
        <EmptyState icon={PartyPopper} title="You're all clear. No overdue books right now." />
      ) : (
        <>
          <div className="mb-10 grid gap-6 lg:grid-cols-2">
            <section className="app-card p-5" aria-labelledby="od-days"><SectionHeader id="od-days" title="Overdue by days" description="Current overdue loans, grouped by how late they are." /><ColumnChart data={buckets} unit="loans" /></section>
            <section className="app-card p-5" aria-labelledby="od-trend"><SectionHeader id="od-trend" title="Overdue trend" description="Loans overdue at the end of each day, last 3 weeks." /><TrendChart data={trend} unit="overdue loans" /></section>
          </div>
          <SectionHeader title="Overdue loans" description="Most overdue first." />
          <LoanList loans={overdue} mode="staff" urgent />
        </>
      )}

      {dueSoon.length > 0 && (
        <section className="mt-12" aria-labelledby="due-soon-heading">
          <SectionHeader id="due-soon-heading" title="Upcoming due dates" description="Loans due within the next 3 days." />
          <LoanList loans={dueSoon} mode="staff" />
        </section>
      )}
    </>
  );
}
