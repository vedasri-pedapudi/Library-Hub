import { Link } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, CalendarDays, Clock, History, Mail, Phone, Sparkles, ArrowRightLeft } from "lucide-react";
import type { Member } from "@/services/types";
import { useLibrary, useLibraryActions } from "@/services/store";
import { memberLoans, readingProfile } from "@/services/selectors";
import { getLoanStatus, dueLabel } from "@/services/loanRules";
import { activeRecommender } from "@/features/recommendations/engine";
import { LoanList } from "@/features/loans/LoanList";
import { useIssueDialog } from "@/features/loans/IssueLoanDialog";
import { Avatar } from "@/components/app/AccountMenu";
import { EmptyState, SectionHeader } from "@/components/common/Layout";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/utils/dates";
import { cn } from "@/lib/utils";

export function MemberProfile({ member, staffView }: { member: Member; staffView: boolean }) {
  const { data } = useLibrary();
  const actions = useLibraryActions();
  const { open: openIssue } = useIssueDialog();
  const { current, history } = memberLoans(data, member.id);
  const profile = readingProfile(data, member.id);
  const books = new Map(data.books.map((b) => [b.id, b]));
  const overdue = current.filter((l) => getLoanStatus(l) === "OVERDUE");
  const dueSoon = current.filter((l) => getLoanStatus(l) === "DUE_SOON");
  const recs = activeRecommender.recommend({ data, memberId: member.id, limit: 4 });
  const maxCat = Math.max(1, ...profile.categories.map((c) => c.count));
  const allCategories = [...new Set(data.books.map((b) => b.category))].sort();

  return (
    <div className="grid gap-8">
      {/* Overview */}
      <section className="app-card flex flex-col gap-6 p-6 md:flex-row md:items-center" aria-label="Member overview">
        <Avatar name={member.name} className="size-20 text-2xl" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl leading-none text-ivory">{member.name}</h1>
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", member.membershipStatus === "active" ? "border-success/30 bg-success/10 text-success" : "border-border text-muted-foreground")}>
              {member.membershipStatus === "active" ? "Active member" : "Inactive"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
            <span>ID {member.id.toUpperCase()}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" /> Joined {formatDate(member.joinedAt)}</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" aria-hidden="true" /> {member.email}</span>
            <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden="true" /> {member.phone}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center">
          {[["Current", current.length], ["Overdue", overdue.length], ["All-time", current.length + history.length]].map(([k, v]) => (
            <div key={k}>
              <p className={cn("font-display text-3xl", k === "Overdue" && Number(v) > 0 ? "text-danger" : "text-ivory")}>{v}</p>
              <p className="text-[10px] tracking-[.16em] text-muted-foreground uppercase">{k}</p>
            </div>
          ))}
        </div>
      </section>

      {staffView && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => openIssue({ memberId: member.id })} disabled={member.membershipStatus !== "active"}><ArrowRightLeft aria-hidden="true" /> Issue book</Button>
          <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2">
            <Switch id="member-active" checked={member.membershipStatus === "active"} onCheckedChange={(c) => actions.updateMember(member.id, { membershipStatus: c ? "active" : "inactive" })} />
            <Label htmlFor="member-active" className="text-xs">Membership active</Label>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(overdue.length > 0 || dueSoon.length > 0) && (
        <section aria-label="Alerts" className="grid gap-2">
          {overdue.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
              <AlertTriangle className="size-4 text-danger" aria-hidden="true" />
              <span className="flex-1 text-ivory">{books.get(l.bookId)?.title} is <strong className="text-danger">{dueLabel(l)}</strong></span>
              {staffView && <Button size="sm" variant="outline" onClick={() => actions.remind(l.id)}>Send reminder</Button>}
            </div>
          ))}
          {dueSoon.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
              <Clock className="size-4 text-warning" aria-hidden="true" />
              <span className="flex-1 text-ivory">{books.get(l.bookId)?.title} — <span className="text-warning">{dueLabel(l)}</span></span>
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby="current-heading">
        <SectionHeader id="current-heading" title="Current loans" />
        {current.length ? <LoanList loans={current} mode={staffView ? "staff" : "member"} showMember={false} /> : <EmptyState icon={BookOpen} title={staffView ? "No current loans." : "You don't have any active loans."} />}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="app-card p-6" aria-labelledby="interests-heading">
          <SectionHeader id="interests-heading" title="Reading interests" description="Derived from borrowing history — the foundation for recommendations." />
          {profile.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No borrowing history yet.</p>
          ) : (
            <ul className="grid gap-2.5">
              {profile.categories.slice(0, 6).map((c) => (
                <li key={c.name} className="grid grid-cols-[130px_1fr_28px] items-center gap-3 text-xs">
                  <span className="truncate text-ivory">{c.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-[width] duration-700" style={{ width: `${(c.count / maxCat) * 100}%` }} /></span>
                  <span className="text-right text-muted-foreground">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3">
            <div><p className="text-[10px] tracking-[.16em] text-muted-foreground uppercase">Favorite authors</p><p className="mt-1 text-ivory">{profile.authors.filter((a) => a.count > 1).slice(0, 2).map((a) => a.name).join(", ") || "—"}</p></div>
            <div><p className="text-[10px] tracking-[.16em] text-muted-foreground uppercase">Avg. loan</p><p className="mt-1 text-ivory">{profile.avgLoanDays !== null ? `${profile.avgLoanDays} days` : "—"}</p></div>
            <div><p className="text-[10px] tracking-[.16em] text-muted-foreground uppercase">Pace</p><p className="mt-1 text-ivory">{profile.booksPerMonth} books / month</p></div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 text-[10px] tracking-[.16em] text-muted-foreground uppercase">{staffView ? "Declared interests" : "Your interests (tap to change)"}</p>
            <div className="flex flex-wrap gap-2">
              {(staffView ? member.interests : allCategories).map((c) => {
                const on = member.interests.includes(c);
                return staffView ? (
                  <span key={c} className="rounded-full border border-gold/30 px-2.5 py-0.5 text-xs text-gold-soft">{c}</span>
                ) : (
                  <button key={c} type="button" aria-pressed={on} onClick={() => actions.updateMember(member.id, { interests: on ? member.interests.filter((i) => i !== c) : [...member.interests, c] })}
                    className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", on ? "border-gold bg-gold/10 text-gold-soft" : "border-border text-muted-foreground hover:text-ivory")}>
                    {c}
                  </button>
                );
              })}
              {staffView && member.interests.length === 0 && <span className="text-xs text-muted-foreground">None declared</span>}
            </div>
          </div>
        </section>

        <section className="app-card p-6" aria-labelledby="recs-heading">
          <SectionHeader id="recs-heading" title="Recommended next" action={<Link to="/recommendations" className="text-xs text-gold">All picks →</Link>} />
          {recs.length === 0 ? <p className="text-sm text-muted-foreground">Borrow a few books to unlock personalized recommendations.</p> : (
            <ul className="grid gap-3">
              {recs.map((r) => {
                const b = books.get(r.bookId);
                if (!b) return null;
                return (
                  <li key={r.id} className="flex items-center gap-3">
                    <BookCover book={b} size="sm" className="w-10 shrink-0" />
                    <div className="min-w-0">
                      <Link to="/books/$bookId" params={{ bookId: b.id }} className="line-clamp-1 text-sm text-ivory hover:text-gold-soft">{b.title}</Link>
                      <p className="flex items-center gap-1 text-[11px] text-gold-soft"><Sparkles className="size-3" aria-hidden="true" /> {r.reason}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="history-heading">
        <SectionHeader id="history-heading" title="Borrowing history" description={`${history.length} returned books`} />
        {history.length === 0 ? <EmptyState icon={History} title="No returned books yet" /> : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {history.slice(0, 15).map((l) => {
              const b = books.get(l.bookId);
              if (!b) return null;
              return (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1"><Link to="/books/$bookId" params={{ bookId: b.id }} className="text-ivory hover:text-gold-soft">{b.title}</Link> <span className="text-xs text-muted-foreground">· {b.category}</span></span>
                  <span className="text-xs text-muted-foreground">Returned {formatDate(l.returnedAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
