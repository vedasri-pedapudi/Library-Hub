import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRightLeft, BookCopy, BookOpen, Clock, RotateCcw, Sparkles, UserPlus, Users, Activity as ActivityIcon, BookmarkPlus, BellRing, BookPlus, RefreshCw, CheckCircle2 } from "lucide-react";
import { useLibrary } from "@/services/store";
import { borrowCounts, dueSoonLoans, libraryStats, overdueLoans, popularBooks } from "@/services/selectors";
import { daysOverdue, dueLabel } from "@/services/loanRules";
import { activeRecommender } from "@/features/recommendations/engine";
import { useIssueDialog } from "@/features/loans/IssueLoanDialog";
import { PageHeader, SectionHeader, StatCard } from "@/components/common/Layout";
import { BookCover } from "@/components/books/BookCover";
import { StatusBar, TrendChart } from "@/features/analytics/charts";
import { Button } from "@/components/ui/button";
import type { ActivityType } from "@/services/types";
import { addDays, formatShortDate, startOfDay, timeAgo } from "@/utils/dates";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | PageNest" }] }),
  component: Dashboard,
});

const ACTIVITY: Record<ActivityType, { verb: string; Icon: typeof BookOpen }> = {
  BORROW: { verb: "borrowed", Icon: BookOpen },
  RETURN: { verb: "returned", Icon: RotateCcw },
  RENEW: { verb: "renewed", Icon: RefreshCw },
  RESERVE: { verb: "reserved", Icon: BookmarkPlus },
  MEMBER_JOINED: { verb: "New member registered", Icon: UserPlus },
  BOOK_ADDED: { verb: "New book added", Icon: BookPlus },
  REMINDER_SENT: { verb: "Reminder sent to", Icon: BellRing },
};

function Dashboard() {
  const { data, librarian } = useLibrary();
  const { open: openIssue } = useIssueDialog();
  const stats = libraryStats(data);
  const overdue = overdueLoans(data).slice(0, 5);
  const dueSoon = dueSoonLoans(data).slice(0, 5);
  const popular = popularBooks(data, 5, 60);
  const counts = borrowCounts(data, 60);
  const books = new Map(data.books.map((b) => [b.id, b]));
  const members = new Map(data.members.map((m) => [m.id, m]));
  const now = new Date();
  const hour = now.getHours();

  const activity = useMemo(() => {
    const t = Date.now();
    return data.activities.filter((a) => new Date(a.timestamp).getTime() <= t).slice(0, 8);
  }, [data.activities]);

  const borrowTrend = useMemo(() => {
    const today = startOfDay();
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(today, i - 13);
      const next = addDays(day, 1).getTime();
      return { label: formatShortDate(day.toISOString()), value: data.loans.filter((l) => { const t = new Date(l.borrowedAt).getTime(); return t >= day.getTime() && t < next; }).length };
    });
  }, [data.loans]);

  const recStats = useMemo(() => {
    const active = data.members.filter((m) => m.membershipStatus === "active");
    return { generated: active.reduce((s, m) => s + activeRecommender.recommend({ data, memberId: m.id, limit: 12 }).length, 0), sent: data.notifications.filter((n) => n.type === "RECOMMENDATION").length };
  }, [data]);

  const borrowed = stats.totalCopies - stats.availableCopies;
  const unavailableCopies = data.books.filter((b) => !b.archived && b.unavailable).reduce((s, b) => s + b.availableCopies, 0);

  return (
    <>
      <PageHeader
        eyebrow={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title={<>Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, {librarian.name.split(" ")[0]}.</>}
        description="Everything happening in your library, in one place."
        actions={<><Button variant="outline" asChild><Link to="/overdue">Review overdue</Link></Button><Button onClick={() => openIssue()}><ArrowRightLeft aria-hidden="true" /> Issue book</Button></>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total books" value={stats.totalBooks} icon={BookCopy} hint={`${stats.totalCopies} physical copies`} />
        <StatCard label="Active members" value={stats.activeMembers} icon={Users} hint={`${stats.newMembers} joined this month`} />
        <StatCard label="Active loans" value={stats.activeLoans} icon={BookOpen} hint={`${stats.borrowedThisWeek} borrowed this week`} />
        <StatCard label="Overdue books" value={stats.overdue} icon={AlertTriangle} tone={stats.overdue ? "danger" : "success"} hint={`${stats.membersWithOverdue} members affected`} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Due soon" value={stats.dueSoon} icon={Clock} />
        <MiniStat label="Returned this week" value={stats.returnedThisWeek} icon={CheckCircle2} />
        <MiniStat label="New members" value={stats.newMembers} icon={UserPlus} />
        <MiniStat label="Borrowing activity (7d)" value={stats.borrowedThisWeek} icon={ActivityIcon} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="app-card p-5 xl:col-span-2" aria-labelledby="dash-overdue">
          <SectionHeader id="dash-overdue" title="Overdue loans" description="The most urgent first." action={<Link to="/overdue" className="text-xs text-gold">View all →</Link>} />
          {overdue.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">You're all clear. No overdue books right now.</p> : (
            <ul className="divide-y divide-border">
              {overdue.map((l) => {
                const b = books.get(l.bookId);
                const m = members.get(l.memberId);
                const d = daysOverdue(l);
                return (
                  <li key={l.id} className="flex items-center gap-3 py-3">
                    {b && <BookCover book={b} size="sm" className="w-9 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ivory">{b?.title}</p>
                      {m && <Link to="/members/$memberId" params={{ memberId: m.id }} className="text-xs text-muted-foreground hover:text-gold-soft">{m.name}</Link>}
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${d > 7 ? "bg-danger/20 text-danger" : "bg-danger/10 text-danger"}`}>
                      <AlertTriangle className="size-3" aria-hidden="true" /> {dueLabel(l)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="app-card p-5" aria-labelledby="dash-due">
          <SectionHeader id="dash-due" title="Due soon" description="Next 3 days." />
          {dueSoon.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing due in the next 3 days.</p> : (
            <ul className="grid gap-3">
              {dueSoon.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0"><span className="block truncate text-ivory">{books.get(l.bookId)?.title}</span><span className="block text-xs text-muted-foreground">{members.get(l.memberId)?.name}</span></span>
                  <span className="shrink-0 text-xs text-warning">{dueLabel(l)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="app-card p-5 xl:col-span-2" aria-labelledby="dash-trend">
          <SectionHeader id="dash-trend" title="Borrowing activity" description="Books borrowed per day, last 14 days." />
          <TrendChart data={borrowTrend} unit="books borrowed" />
        </section>

        <section className="app-card p-5" aria-labelledby="dash-activity">
          <SectionHeader id="dash-activity" title="Recent activity" />
          <ul className="grid gap-3.5">
            {activity.map((a) => {
              const { verb, Icon } = ACTIVITY[a.type];
              const m = a.memberId ? members.get(a.memberId) : null;
              const b = a.bookId ? books.get(a.bookId) : null;
              const firstName = m?.name.split(" ")[0];
              const text = a.type === "MEMBER_JOINED" ? <>{verb}: <strong className="font-medium text-ivory">{m?.name}</strong></>
                : a.type === "BOOK_ADDED" ? <>{verb}: <strong className="font-medium text-ivory">{b?.title}</strong></>
                : a.type === "REMINDER_SENT" ? <>{verb} <strong className="font-medium text-ivory">{firstName}</strong> for {b?.title}</>
                : <><strong className="font-medium text-ivory">{firstName}</strong> {verb} <span className="text-ivory/90">{b?.title}</span></>;
              return (
                <li key={a.id} className="flex gap-3 text-xs">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-gold"><Icon className="size-3" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 text-muted-foreground">{text}<span className="block text-[10px]">{timeAgo(a.timestamp)}</span></span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="app-card p-5" aria-labelledby="dash-popular">
          <SectionHeader id="dash-popular" title="Popular books" description="Most borrowed, last 60 days." />
          <ol className="grid gap-3">
            {popular.map((b, i) => (
              <li key={b.id} className="flex items-center gap-3">
                <span className="w-4 font-display text-lg text-muted-foreground">{i + 1}</span>
                <BookCover book={b} size="sm" className="w-8 shrink-0" />
                <Link to="/books/$bookId" params={{ bookId: b.id }} className="min-w-0 flex-1 truncate text-sm text-ivory hover:text-gold-soft">{b.title}</Link>
                <span className="text-xs text-muted-foreground tabular-nums">{counts.get(b.id)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="app-card p-5" aria-labelledby="dash-catalog">
          <SectionHeader id="dash-catalog" title="Catalog overview" description={`${stats.totalCopies} copies in total`} />
          <StatusBar
            segments={[
              { key: "available", label: "Available", value: stats.availableCopies, colorClass: "bg-success", icon: <CheckCircle2 /> },
              { key: "borrowed", label: "Borrowed", value: borrowed - unavailableCopies, colorClass: "bg-warning", icon: <BookOpen /> },
              { key: "unavailable", label: "Out of circulation", value: unavailableCopies, colorClass: "bg-muted-foreground", icon: <AlertTriangle /> },
            ]}
          />
        </section>

        <section className="app-card p-5" aria-labelledby="dash-recs">
          <SectionHeader id="dash-recs" title="Recommendations" description="Rule-based engine activity." action={<Link to="/recommendations" className="text-xs text-gold">Open →</Link>} />
          <div className="grid grid-cols-2 gap-4">
            <div><p className="font-display text-4xl text-ivory">{recStats.generated}</p><p className="text-xs text-muted-foreground">picks generated for active members</p></div>
            <div><p className="font-display text-4xl text-ivory">{recStats.sent}</p><p className="text-xs text-muted-foreground">recommendation alerts sent</p></div>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-gold-soft"><Sparkles className="size-3.5" aria-hidden="true" /> Refreshed automatically when borrowing changes.</p>
        </section>
      </div>
    </>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-4 py-3">
      <Icon className="size-4 text-gold" aria-hidden="true" />
      <span className="flex-1 text-xs text-muted-foreground">{label}</span>
      <span className="font-display text-2xl text-ivory tabular-nums">{value}</span>
    </div>
  );
}
