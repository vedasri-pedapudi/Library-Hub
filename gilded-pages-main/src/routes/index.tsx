import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, BookOpen, Clock, Library, Play, Search, Sparkles, LayoutDashboard, LogIn, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LibraryScene } from "@/features/home/LibraryScene";
import { useLibrary } from "@/services/store";
import { activeBooks, dueSoonLoans, libraryStats, memberLoans, newArrivals, overdueLoans, popularBooks } from "@/services/selectors";
import { activeRecommender } from "@/features/recommendations/engine";
import { BookCard, BookShelf, ShelfItem } from "@/components/books/BookCard";
import { BookCover } from "@/components/books/BookCover";
import { SectionHeader } from "@/components/common/Layout";
import { LoanStatusBadge } from "@/components/common/StatusBadges";
import { dueLabel, getLoanStatus } from "@/services/loanRules";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AccountMenu } from "@/components/app/AccountMenu";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Brand } from "@/components/app/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PageNest | Discover Your Next Chapter" },
      { name: "description", content: "Explore the library, keep track of your loans, and discover books chosen around your reading interests." },
      { property: "og:title", content: "PageNest | Discover Your Next Chapter" },
      { property: "og:description", content: "Explore the library, keep track of your loans, and discover books chosen around your reading interests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function compact(n: number) {
  return n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n);
}

function Index() {
  const [sequence, setSequence] = useState(0);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data, isLibrarian, isAuthenticated } = useLibrary();
  const stats = libraryStats(data);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/catalog", search: query.trim() ? { q: query.trim() } : {} });
  };

  const navLinks = isLibrarian
    ? [{ to: "/dashboard", label: "Dashboard" }, { to: "/catalog", label: "Catalog" }, { to: "/manage/loans", label: "Loans" }, { to: "/overdue", label: "Overdue" }]
    : !isAuthenticated
    ? [{ to: "/catalog", label: "Catalog" }, { to: "/catalog", label: "New arrivals", search: { sort: "newest" } }, { to: "/catalog", label: "Popular", search: { sort: "borrowed" } }]
    : [{ to: "/catalog", label: "Catalog" }, { to: "/loans", label: "My Loans" }, { to: "/recommendations", label: "Recommendations" }, { to: "/saved", label: "Saved" }];

  return (
    <main id="top">
      <section className="library-hero" aria-labelledby="hero-title">
        <LibraryScene sequence={sequence} />
        <div className="hero-content">
          <header className="site-header">
            <Brand />
            <nav className="header-nav" aria-label="Main navigation">
              {navLinks.map((l) => <Link key={l.label} to={l.to as "/catalog"} search={"search" in l ? (l.search as { sort: "newest" | "borrowed" }) : {}}>{l.label}</Link>)}
            </nav>
            <div className="header-actions">
              <ThemeToggle />
              {isAuthenticated && <NotificationBell />}
              <AccountMenu />
            </div>
          </header>
          <div className="hero-main">
            <div className="eyebrow">A WORLD OF STORIES AWAITS</div>
            <h1 id="hero-title" className="hero-heading">Discover<br />your next<br />chapter</h1>
            <p className="hero-description">Explore the library, keep track of your loans, and discover books chosen around your reading interests.</p>
            <form className="hero-search" role="search" onSubmit={submit}>
              <Search className="size-4 shrink-0 text-gold-soft" aria-hidden="true" />
              <label htmlFor="hero-search" className="sr-only">Search the catalog</label>
              <input id="hero-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search books, authors, ISBNs..." autoComplete="off" />
              <Button type="submit" variant="hero" size="heroSmall">Search</Button>
            </form>
            <div className="hero-actions">
              <Button asChild variant="hero" size="hero"><Link to="/catalog"><Library aria-hidden="true" /> Browse Catalog <ArrowRight aria-hidden="true" /></Link></Button>
              {!isAuthenticated ? (
                <Button asChild variant="heroOutline" size="hero"><Link to="/login"><LogIn aria-hidden="true" /> Sign in</Link></Button>
              ) : isLibrarian ? (
                <Button asChild variant="heroOutline" size="hero"><Link to="/dashboard"><LayoutDashboard aria-hidden="true" /> Dashboard</Link></Button>
              ) : (
                <Button asChild variant="heroOutline" size="hero"><Link to="/loans"><BookOpen aria-hidden="true" /> My Loans</Link></Button>
              )}
              <Button asChild variant="heroOutline" size="hero"><Link to="/recommendations"><Sparkles aria-hidden="true" /> Recommendations</Link></Button>
              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-ivory hover:bg-accent/50" onClick={() => setSequence((v) => v + 1)} aria-label="Replay library story animation" title="Watch story">
                <Play fill="currentColor" aria-hidden="true" />
              </Button>
            </div>
            <div className="hero-stats" aria-label="Library at a glance">
              <div className="hero-stat"><strong>{compact(stats.totalCopies)}</strong><span>Books on the shelves</span></div>
              <div className="hero-stat"><strong>{stats.activeMembers}</strong><span>Active members</span></div>
              <div className="hero-stat"><strong>{stats.categories}</strong><span>Categories</span></div>
            </div>
          </div>
          <div className="hero-bottom"><span>WHERE EVERY STORY BEGINS</span><a className="hero-scroll" href="#shelves">Explore below <ArrowDown size={14} aria-hidden="true" /></a></div>
        </div>
      </section>
      <HomeShelves />
    </main>
  );
}

function HomeShelves() {
  const { data, isLibrarian, currentMemberId, isAuthenticated } = useLibrary();
  const isMember = isAuthenticated && !isLibrarian;
  const popular = useMemo(() => popularBooks(data, 12, 30), [data]);
  const arrivals = useMemo(() => newArrivals(data, 12), [data]);
  const available = useMemo(() => activeBooks(data).filter((b) => b.availableCopies > 0 && !b.unavailable).sort((a, b) => b.availableCopies - a.availableCopies).slice(0, 12), [data]);
  const recs = useMemo(() => (isMember ? activeRecommender.recommend({ data, memberId: currentMemberId, limit: 12 }) : []), [data, isMember, currentMemberId]);
  const books = new Map(data.books.map((b) => [b.id, b]));
  const mine = !isMember ? [] : memberLoans(data, currentMemberId).current.filter((l) => ["DUE_SOON", "OVERDUE"].includes(getLoanStatus(l)));
  const staffOverdue = isLibrarian ? overdueLoans(data).length : 0;
  const staffDueSoon = isLibrarian ? dueSoonLoans(data).length : 0;

  return (
    <div id="shelves" className="shelf-section">
      <div className="shelf-inner grid grid-cols-[minmax(0,1fr)] gap-14">
        {mine.length > 0 && (
          <section aria-labelledby="due-heading" className="app-card p-5 md:p-6">
            <SectionHeader id="due-heading" title="Your books due soon" description="Return or renew to keep your record clear." action={<Link to="/loans" className="text-xs text-gold hover:text-gold-soft">Manage loans →</Link>} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((loan) => {
                const book = books.get(loan.bookId);
                if (!book) return null;
                return (
                  <li key={loan.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3">
                    <BookCover book={book} size="sm" className="w-11 shrink-0" />
                    <div className="min-w-0">
                      <Link to="/books/$bookId" params={{ bookId: book.id }} className="line-clamp-1 font-display text-lg text-ivory">{book.title}</Link>
                      <div className="mt-1 flex items-center gap-2"><LoanStatusBadge status={getLoanStatus(loan)} /><span className="text-xs text-muted-foreground">{dueLabel(loan)}</span></div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {isLibrarian && (staffOverdue > 0 || staffDueSoon > 0) && (
          <section className="app-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-10 place-items-center rounded-full bg-danger/10 text-danger"><TriangleAlert className="size-5" aria-hidden="true" /></span>
              <div>
                <p className="font-display text-2xl text-ivory">{staffOverdue} overdue · {staffDueSoon} due soon</p>
                <p className="text-xs text-muted-foreground">Today's automated check has flagged these loans.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to="/overdue">Review overdue</Link></Button>
              <Button asChild><Link to="/dashboard">Open dashboard</Link></Button>
            </div>
          </section>
        )}

        <Shelf title="Popular This Week" description="Most borrowed across the library recently." link="/catalog" sort="borrowed">
          {popular.map((b) => <ShelfItem key={b.id}><BookCard book={b} compact /></ShelfItem>)}
        </Shelf>

        {isMember && (
          <Shelf title="Recommended For You" description="Chosen from your borrowing history — hover a book to see why." link="/recommendations">
            {recs.length === 0 ? <p className="text-sm text-muted-foreground">Borrow a few books to unlock personalized recommendations.</p> : recs.map((r) => {
              const b = books.get(r.bookId);
              return b ? <ShelfItem key={r.id}><BookCard book={b} reason={r.reason} compact /></ShelfItem> : null;
            })}
          </Shelf>
        )}

        <Shelf title="New Arrivals" description="Recently added to the collection." link="/catalog" sort="newest">
          {arrivals.map((b) => <ShelfItem key={b.id}><BookCard book={b} compact /></ShelfItem>)}
        </Shelf>

        <Shelf title="Available Now" description="On the shelf and ready to borrow today." link="/catalog">
          {available.map((b) => <ShelfItem key={b.id}><BookCard book={b} compact /></ShelfItem>)}
        </Shelf>

        <section className="grid gap-6 border-t border-border py-12 md:grid-cols-3" aria-label="How PageNest works">
          {[
            { icon: Library, title: "One connected catalog", text: "Books, members and loans live together, so every record tells the whole story." },
            { icon: Clock, title: "Nothing slips through", text: "Due-soon and overdue loans are flagged automatically every day, with alerts sent to members." },
            { icon: Sparkles, title: "Picks with reasons", text: "Recommendations come from borrowing history, favourite genres and authors — and always explain why." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="mb-3 size-5 text-gold" aria-hidden="true" />
              <h3 className="font-display text-2xl text-ivory">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Shelf({ title, description, link, sort, children }: { title: string; description: string; link: "/catalog" | "/recommendations"; sort?: "newest" | "borrowed"; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <SectionHeader
        title={title}
        description={description}
        action={<Link to={link} search={link === "/catalog" && sort ? { sort } : {}} className="shrink-0 text-xs text-gold hover:text-gold-soft">View all →</Link>}
      />
      <BookShelf label={title}>{children}</BookShelf>
    </section>
  );
}
