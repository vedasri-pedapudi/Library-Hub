import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, CheckCircle2, Clock, Percent, RotateCcw, Timer, Ban, Table2 } from "lucide-react";
import { useLibrary } from "@/services/store";
import { borrowCounts, indexById, memberSummaries, popularBooks } from "@/services/selectors";
import { getLoanStatus } from "@/services/loanRules";
import { ColumnChart, RankedBars, StatusBar } from "@/features/analytics/charts";
import { PageHeader, SectionHeader, StatCard } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { addDays, daysBetween, startOfDay } from "@/utils/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics | PageNest" }] }),
  component: AnalyticsPage,
});

const RANGES = { 30: "30 days", 90: "90 days", 180: "6 months" } as const;
type Range = keyof typeof RANGES;

function AnalyticsPage() {
  const { data } = useLibrary();
  const [range, setRange] = useState<Range>(180);
  const [showTable, setShowTable] = useState(false);
  const books = indexById(data.books);

  const m = useMemo(() => {
    const now = new Date();
    const loans = data.loans.filter((l) => daysBetween(l.borrowedAt, now) <= range);
    const statuses = loans.map((l) => getLoanStatus(l, now));
    const returned = loans.filter((l) => l.returnedAt);
    const lateReturns = returned.filter((l) => new Date(l.returnedAt as string) > new Date(l.dueDate)).length;
    const overdueNow = statuses.filter((s) => s === "OVERDUE").length;
    const avg = returned.length ? Math.round((returned.reduce((s, l) => s + daysBetween(l.borrowedAt, l.returnedAt as string), 0) / returned.length) * 10) / 10 : 0;

    // Loans over time: weekly buckets for ≤90 days, monthly for 6 months.
    const weekly = range <= 90;
    const buckets: { label: string; value: number }[] = [];
    const today = startOfDay();
    if (weekly) {
      const weeks = Math.ceil(range / 7);
      for (let i = weeks - 1; i >= 0; i--) {
        const end = addDays(today, -i * 7 + 1);
        const start = addDays(end, -7);
        buckets.push({ label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: loans.filter((l) => { const t = new Date(l.borrowedAt); return t >= start && t < end; }).length });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        buckets.push({ label: d.toLocaleDateString("en-US", { month: "short" }), value: loans.filter((l) => { const t = new Date(l.borrowedAt); return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth(); }).length });
      }
    }

    const genre = new Map<string, number>();
    for (const l of loans) { const b = books.get(l.bookId); if (b) genre.set(b.category, (genre.get(b.category) ?? 0) + 1); }

    return {
      total: loans.length,
      returnRate: loans.length ? Math.round((returned.length / loans.length) * 100) : 0,
      overdueRate: returned.length + overdueNow ? Math.round(((lateReturns + overdueNow) / (returned.length + overdueNow)) * 100) : 0,
      avg,
      active: statuses.filter((s) => s === "ACTIVE" || s === "RENEWED" || s === "DUE_SOON").length,
      returnedCount: returned.length,
      overdueNow,
      buckets,
      genres: [...genre].map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value),
    };
  }, [data.loans, range, books]);

  const topBooks = popularBooks(data, 8, range);
  const counts = borrowCounts(data, range);
  const activeMembers = memberSummaries(data).map((s) => ({ ...s, recent: data.loans.filter((l) => l.memberId === s.member.id && daysBetween(l.borrowedAt, new Date()) <= range).length })).sort((a, b) => b.recent - a.recent).slice(0, 6);
  const unavailable = data.books.filter((b) => !b.archived && (b.availableCopies === 0 || b.unavailable));

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Analytics"
        description="How the collection is being used."
        actions={
          <div className="flex rounded-full border border-border p-1" role="group" aria-label="Time range">
            {(Object.keys(RANGES) as unknown as Range[]).map((r) => (
              <button key={r} type="button" onClick={() => setRange(Number(r) as Range)} aria-pressed={range === Number(r)} className={cn("rounded-full px-3 py-1.5 text-xs transition-colors", range === Number(r) ? "bg-gold text-ink" : "text-muted-foreground hover:text-ivory")}>{RANGES[r]}</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total loans" value={m.total} icon={BookOpen} hint={`in the last ${RANGES[range]}`} />
        <StatCard label="Return rate %" value={m.returnRate} icon={RotateCcw} tone="success" hint="Loans already returned" />
        <StatCard label="Overdue rate %" value={m.overdueRate} icon={Percent} tone="danger" hint="Returned late or overdue now" />
        <StatCard label="Avg. loan (days)" value={Math.round(m.avg)} icon={Timer} hint={`${m.avg} days exactly`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="app-card p-5 lg:col-span-2" aria-labelledby="an-time">
          <SectionHeader id="an-time" title="Loans over time" description={range <= 90 ? "Books borrowed per week." : "Books borrowed per month."} action={<Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowTable((s) => !s)} aria-pressed={showTable}><Table2 aria-hidden="true" /> {showTable ? "Chart" : "Table"}</Button>} />
          {showTable ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">Period</th><th className="py-1 text-right font-medium">Loans</th></tr></thead>
              <tbody>{m.buckets.map((b) => <tr key={b.label} className="border-t border-border"><td className="py-1.5">{b.label}</td><td className="py-1.5 text-right tabular-nums">{b.value}</td></tr>)}</tbody>
            </table>
          ) : <ColumnChart data={m.buckets} unit="loans" height={250} />}
        </section>

        <section className="app-card p-5" aria-labelledby="an-status">
          <SectionHeader id="an-status" title="Loan outcomes" description={`Loans started in the last ${RANGES[range]}.`} />
          <StatusBar segments={[
            { key: "active", label: "Active", value: m.active, colorClass: "bg-info", icon: <Clock /> },
            { key: "returned", label: "Returned", value: m.returnedCount, colorClass: "bg-success", icon: <CheckCircle2 /> },
            { key: "overdue", label: "Overdue", value: m.overdueNow, colorClass: "bg-danger", icon: <AlertTriangle /> },
          ]} />
        </section>

        <section className="app-card p-5" aria-labelledby="an-genre">
          <SectionHeader id="an-genre" title="Borrowing by genre" />
          <RankedBars rows={m.genres.slice(0, 8)} unit="loans" />
        </section>

        <section className="app-card p-5" aria-labelledby="an-books">
          <SectionHeader id="an-books" title="Most borrowed books" />
          <RankedBars rows={topBooks.map((b) => ({ key: b.id, label: <Link to="/books/$bookId" params={{ bookId: b.id }} className="hover:text-gold-soft">{b.title}</Link>, value: counts.get(b.id) ?? 0 }))} unit="loans" />
        </section>

        <section className="app-card p-5" aria-labelledby="an-members">
          <SectionHeader id="an-members" title="Most active members" />
          <RankedBars rows={activeMembers.map((s) => ({ key: s.member.id, label: <Link to="/members/$memberId" params={{ memberId: s.member.id }} className="hover:text-gold-soft">{s.member.name}</Link>, value: s.recent }))} unit="loans" />
        </section>
      </div>

      <section className="mt-8" aria-labelledby="an-unavail">
        <SectionHeader id="an-unavail" title="Books currently unavailable" description={`${unavailable.length} titles have no copies on the shelf.`} />
        {unavailable.length === 0 ? <p className="text-sm text-muted-foreground">Every title has at least one copy available.</p> : (
          <ul className="flex flex-wrap gap-2">
            {unavailable.map((b) => (
              <li key={b.id}>
                <Link to="/books/$bookId" params={{ bookId: b.id }} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-ivory hover:border-gold/50">
                  <Ban className="size-3 text-muted-foreground" aria-hidden="true" /> {b.title} <span className="text-muted-foreground">{b.unavailable ? "out of circulation" : `0/${b.totalCopies}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
