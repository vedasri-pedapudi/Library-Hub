import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, Send, Sparkles } from "lucide-react";
import { useLibrary, useLibraryActions } from "@/services/store";
import { activeRecommender, recommendationSections } from "@/features/recommendations/engine";
import { readingProfile } from "@/services/selectors";
import type { Recommendation } from "@/services/types";
import { BookCard, BookShelf, ShelfItem } from "@/components/books/BookCard";
import { BookCover } from "@/components/books/BookCover";
import { EmptyState, PageHeader, SectionHeader, StatCard } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_app/recommendations")({
  head: () => ({ meta: [{ title: "Recommendations | PageNest" }] }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const { isLibrarian } = useLibrary();
  return isLibrarian ? <LibrarianRecommendations /> : <MemberRecommendations />;
}

function RecShelf({ title, description, recs }: { title: string; description: string; recs: Recommendation[] }) {
  const { data } = useLibrary();
  const books = new Map(data.books.map((b) => [b.id, b]));
  if (!recs.length) return null;
  return (
    <section aria-label={title}>
      <SectionHeader title={title} description={description} />
      <BookShelf label={title}>
        {recs.map((r) => {
          const b = books.get(r.bookId);
          return b ? <ShelfItem key={r.id}><BookCard book={b} reason={r.reason} /></ShelfItem> : null;
        })}
      </BookShelf>
    </section>
  );
}

function MemberRecommendations() {
  const { data, currentMemberId } = useLibrary();
  const sections = useMemo(() => recommendationSections(data, currentMemberId), [data, currentMemberId]);
  const profile = readingProfile(data, currentMemberId);
  const member = data.members.find((m) => m.id === currentMemberId);

  return (
    <>
      <PageHeader
        eyebrow="Chosen for you"
        title="Recommended for You"
        description={sections.coldStart
          ? "You're just getting started, so these are popular books and new arrivals. Borrow a few books and your picks will become personal."
          : `Based on ${profile.categories.slice(0, 3).map((c) => c.name).join(", ")}${profile.authors[0] && profile.authors[0].count > 1 ? ` and books by ${profile.authors[0].name}` : ""}.`}
      />

      {sections.all.length === 0 ? (
        <EmptyState icon={Sparkles} title="Borrow a few books to unlock personalized recommendations." action={<Button asChild><Link to="/catalog">Browse catalog</Link></Button>} />
      ) : (
        <div className="grid gap-12">
          {sections.becauseYouRead && sections.becauseYouRead.items.length > 0 && (
            <section aria-label={`Because you read ${sections.becauseYouRead.anchor.title}`}>
              <div className="mb-4 flex items-center gap-4">
                <BookCover book={sections.becauseYouRead.anchor} size="sm" className="w-12 shrink-0" />
                <div>
                  <p className="text-[10px] tracking-[.24em] text-muted-foreground uppercase">Because you read</p>
                  <h2 className="font-display text-2xl text-ivory">{sections.becauseYouRead.anchor.title}</h2>
                </div>
              </div>
              <BookShelf label="Because you read">
                {sections.becauseYouRead.items.map(({ book, reason }) => <ShelfItem key={book.id}><BookCard book={book} reason={reason} /></ShelfItem>)}
              </BookShelf>
            </section>
          )}
          <RecShelf title="Based on Your Interests" description={member?.interests.length ? `Your favourite genres and authors.` : "Genres you borrow most."} recs={sections.interests} />
          <RecShelf title="Similar to Your Recent Reads" description="Books that share themes with what you've borrowed lately." recs={sections.similar} />
          <RecShelf title="Popular in Your Favorite Genres" description="What other readers with similar taste are borrowing." recs={sections.popularInGenres} />
          <RecShelf title="New Arrivals You May Like" description="Recently added books that match your interests." recs={sections.newArrivals} />
          <HowItWorks />
        </div>
      )}
    </>
  );
}

function HowItWorks() {
  return (
    <aside className="app-card flex gap-4 p-5 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
      <p>
        <strong className="font-medium text-ivory">How these are chosen.</strong> Recommendations use clear rules, not AI: your borrowing history, the genres and authors you return to,
        books with similar themes, what's popular with readers like you, and new arrivals. Each card tells you which rule picked it.
      </p>
    </aside>
  );
}

function LibrarianRecommendations() {
  const { data } = useLibrary();
  const actions = useLibraryActions();
  const members = data.members.filter((m) => m.membershipStatus === "active").sort((a, b) => a.name.localeCompare(b.name));
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const recs = useMemo(() => (memberId ? activeRecommender.recommend({ data, memberId, limit: 12 }) : []), [data, memberId]);
  const profile = memberId ? readingProfile(data, memberId) : null;
  const books = new Map(data.books.map((b) => [b.id, b]));
  const totals = useMemo(() => {
    let total = 0;
    let covered = 0;
    for (const m of members) {
      const n = activeRecommender.recommend({ data, memberId: m.id, limit: 12 }).length;
      total += n;
      if (n > 0) covered++;
    }
    return { total, covered };
  }, [data, members]);
  const sent = data.notifications.filter((n) => n.type === "RECOMMENDATION").length;

  return (
    <>
      <PageHeader eyebrow="Library intelligence" title="Recommendations" description={`Engine: ${activeRecommender.name}. Every suggestion is explainable.`} />
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard label="Recommendations generated" value={totals.total} icon={Sparkles} hint="Across all active members" />
        <StatCard label="Members covered" value={totals.covered} icon={Users} hint={`of ${members.length} active members`} />
        <StatCard label="Recommendation alerts sent" value={sent} icon={Send} hint="Automated + librarian-sent" />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full max-w-xs gap-1.5">
          <Label htmlFor="rec-member">Member</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger id="rec-member"><SelectValue placeholder="Choose a member" /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/members/$memberId" params={{ memberId }}>View profile</Link></Button>
          <Button disabled={!recs.length} onClick={() => actions.sendRecommendations(memberId, Math.min(5, recs.length))}><Send aria-hidden="true" /> Send picks to member</Button>
        </div>
      </div>

      {profile && (
        <div className="mb-8 flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Reading profile:</span>
          {profile.categories.length === 0 && <span className="text-muted-foreground">No history — using popular books and new arrivals.</span>}
          {profile.categories.slice(0, 4).map((c) => <span key={c.name} className="rounded-full border border-border px-2.5 py-0.5 text-ivory">{c.name} · {c.count}</span>)}
          {profile.authors.filter((a) => a.count > 1).slice(0, 2).map((a) => <span key={a.name} className="rounded-full border border-gold/30 px-2.5 py-0.5 text-gold-soft">{a.name} · {a.count}</span>)}
        </div>
      )}

      {recs.length === 0 ? (
        <EmptyState icon={BookOpen} title="No recommendations for this member yet" />
      ) : (
        <ol className="grid gap-3 md:grid-cols-2">
          {recs.map((r, i) => {
            const b = books.get(r.bookId);
            if (!b) return null;
            return (
              <li key={r.id} className="app-card flex items-center gap-4 p-3">
                <span className="w-5 text-center font-display text-lg text-muted-foreground">{i + 1}</span>
                <BookCover book={b} size="sm" className="w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link to="/books/$bookId" params={{ bookId: b.id }} className="line-clamp-1 text-ivory hover:text-gold-soft">{b.title}</Link>
                  <p className="text-xs text-gold-soft">{r.reason}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground" title="Relevance score">{r.score.toFixed(1)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
