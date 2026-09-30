import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRightLeft, BookmarkPlus, BookOpen, Heart, PackagePlus, Pencil, Ban, CheckCircle2, Archive, BookX } from "lucide-react";
import { useLibrary, useLibraryActions } from "@/services/store";
import { bookAvailability, borrowCounts, waitingReservationCount } from "@/services/selectors";
import { dueLabel, getLoanStatus } from "@/services/loanRules";
import { activeRecommender } from "@/features/recommendations/engine";
import { BookCover } from "@/components/books/BookCover";
import { BookCard, BookGrid } from "@/components/books/BookCard";
import { AvailabilityBadge, LoanStatusBadge } from "@/components/common/StatusBadges";
import { EmptyState, SectionHeader } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { useIssueDialog } from "@/features/loans/IssueLoanDialog";
import { BookFormDialog } from "@/features/catalog/BookFormDialog";
import { formatDate } from "@/utils/dates";

export const Route = createFileRoute("/_app/books/$bookId")({
  head: () => ({ meta: [{ title: "Book details | PageNest" }] }),
  component: BookDetails,
});

function BookDetails() {
  const { bookId } = Route.useParams();
  const router = useRouter();
  const { data, isLibrarian, currentMemberId } = useLibrary();
  const actions = useLibraryActions();
  const { open: openIssue } = useIssueDialog();
  const [editing, setEditing] = useState(false);
  const book = data.books.find((b) => b.id === bookId);

  if (!book) {
    return <EmptyState icon={BookX} title="Book not found" description="It may have been removed from the catalog." action={<Button asChild variant="outline"><Link to="/catalog">Back to catalog</Link></Button>} />;
  }

  const availability = bookAvailability(data, book);
  const queue = waitingReservationCount(data, book.id);
  const saved = data.favorites.some((f) => f.memberId === currentMemberId && f.bookId === book.id);
  const myLoan = data.loans.find((l) => l.memberId === currentMemberId && l.bookId === book.id && !l.returnedAt);
  const myReservation = data.reservations.find((r) => r.memberId === currentMemberId && r.bookId === book.id && (r.status === "waiting" || r.status === "ready"));
  const similar = activeRecommender.similar(data, book.id, 6);
  const timesBorrowed = borrowCounts(data).get(book.id) ?? 0;
  const currentLoans = data.loans.filter((l) => l.bookId === book.id && !l.returnedAt);
  const members = new Map(data.members.map((m) => [m.id, m]));

  const facts: [string, string][] = [
    ["Genre", book.category],
    ["Published", `${book.publicationYear} · ${book.publisher}`],
    ["ISBN", book.isbn],
    ["Language", book.language],
    ["Copies", `${book.availableCopies} available of ${book.totalCopies}`],
    ["Borrowed", `${timesBorrowed} time${timesBorrowed === 1 ? "" : "s"}`],
  ];

  return (
    <>
      <button type="button" onClick={() => router.history.back()} className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-ivory">
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Back
      </button>

      <div className="grid gap-10 md:grid-cols-[minmax(220px,320px)_1fr] lg:gap-14">
        <div className="mx-auto w-full max-w-[280px] md:max-w-none">
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
            <BookCover book={book} size="lg" />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold tracking-[.3em] text-gold uppercase">{book.category}</p>
          <h1 className="mt-3 font-display text-5xl leading-[.95] font-medium text-ivory md:text-6xl">{book.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">by <Link to="/catalog" search={{ q: book.author }} className="text-ivory hover:text-gold-soft">{book.author}</Link></p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AvailabilityBadge status={availability} copies={book.availableCopies} />
            {queue > 0 && <span className="text-xs text-info">{queue} in reservation queue</span>}
            {book.archived && <span className="text-xs text-muted-foreground">Archived</span>}
          </div>

          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-ivory/85">{book.description}</p>

          {/* Actions */}
          <div className="mt-7 flex flex-wrap gap-2">
            {isLibrarian ? (
              <>
                <Button onClick={() => openIssue({ bookId: book.id })} disabled={availability !== "AVAILABLE"}><ArrowRightLeft aria-hidden="true" /> Issue book</Button>
                <Button variant="outline" onClick={() => setEditing(true)}><Pencil aria-hidden="true" /> Edit book</Button>
                <Button variant="outline" onClick={() => actions.addCopies(book.id, 1)}><PackagePlus aria-hidden="true" /> Add copy</Button>
                <Button variant="outline" onClick={() => actions.editBook(book.id, { unavailable: !book.unavailable })}>
                  {book.unavailable ? <><CheckCircle2 aria-hidden="true" /> Return to circulation</> : <><Ban aria-hidden="true" /> Mark unavailable</>}
                </Button>
                <Button variant="ghost" onClick={() => actions.archive(book.id, !book.archived)}><Archive aria-hidden="true" /> {book.archived ? "Restore" : "Archive"}</Button>
              </>
            ) : (
              <>
                {myLoan ? (
                  <Button asChild variant="secondary"><Link to="/loans"><BookOpen aria-hidden="true" /> On your shelf · {dueLabel(myLoan)}</Link></Button>
                ) : availability === "AVAILABLE" ? (
                  <Button onClick={() => actions.borrowSelf(book.id)}><BookOpen aria-hidden="true" /> Borrow</Button>
                ) : myReservation ? (
                  <Button variant="secondary" onClick={() => actions.cancelReservation(myReservation.id)}>{myReservation.status === "ready" ? "Ready for pickup · Cancel" : "Reserved · Cancel reservation"}</Button>
                ) : availability !== "UNAVAILABLE" ? (
                  <Button onClick={() => actions.reserve(book.id)}><BookmarkPlus aria-hidden="true" /> Reserve this book</Button>
                ) : null}
                {!myLoan && availability === "AVAILABLE" && !myReservation && (
                  <Button variant="outline" onClick={() => actions.reserve(book.id)}><BookmarkPlus aria-hidden="true" /> Reserve</Button>
                )}
                <Button variant="outline" onClick={() => actions.toggleFavorite(book.id)} aria-pressed={saved}>
                  <Heart fill={saved ? "currentColor" : "none"} className={saved ? "text-gold" : ""} aria-hidden="true" /> {saved ? "Saved" : "Add to favorites"}
                </Button>
              </>
            )}
          </div>

          <dl className="mt-9 grid gap-x-8 gap-y-4 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] tracking-[.2em] text-muted-foreground uppercase">{k}</dt>
                <dd className="mt-1 text-sm text-ivory">{v}</dd>
              </div>
            ))}
          </dl>

          {isLibrarian && (
            <div className="mt-9">
              <SectionHeader title="Copies on loan" description={`${currentLoans.length} of ${book.totalCopies} copies are out.`} />
              {currentLoans.length === 0 ? <p className="text-sm text-muted-foreground">All copies are on the shelf.</p> : (
                <ul className="grid gap-2">
                  {currentLoans.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/50 px-4 py-3 text-sm">
                      <span>Copy #{l.copyNumber} · <Link to="/members/$memberId" params={{ memberId: l.memberId }} className="text-ivory hover:text-gold-soft">{members.get(l.memberId)?.name}</Link></span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">Due {formatDate(l.dueDate)} <LoanStatusBadge status={getLoanStatus(l)} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <section className="mt-16" aria-labelledby="similar-heading">
        <SectionHeader id="similar-heading" title="Readers who enjoyed this may also like" description="Based on shared themes, authors and what other readers borrowed next." />
        {similar.length ? (
          <BookGrid>{similar.map(({ book: b, reason }) => <BookCard key={b.id} book={b} reason={reason} />)}</BookGrid>
        ) : <p className="text-sm text-muted-foreground">No similar books yet.</p>}
      </section>

      {isLibrarian && <BookFormDialog open={editing} onOpenChange={setEditing} book={book} />}
    </>
  );
}
