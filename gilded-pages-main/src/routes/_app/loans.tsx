import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, BookmarkCheck, History, Library } from "lucide-react";
import { useLibrary, useLibraryActions } from "@/services/store";
import { memberLoans } from "@/services/selectors";
import { dueLabel, getLoanStatus, MAX_RENEWALS, canRenew } from "@/services/loanRules";
import { EmptyState, PageHeader, SectionHeader } from "@/components/common/Layout";
import { LoanStatusBadge } from "@/components/common/StatusBadges";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/utils/dates";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_app/loans")({
  head: () => ({ meta: [{ title: "My Loans | PageNest" }] }),
  component: MyLoans,
});

function MyLoans() {
  const { data, currentMemberId, isLibrarian } = useLibrary();
  const actions = useLibraryActions();
  const { current, history } = memberLoans(data, currentMemberId);
  const books = new Map(data.books.map((b) => [b.id, b]));
  const reservations = data.reservations.filter((r) => r.memberId === currentMemberId && (r.status === "waiting" || r.status === "ready"));
  const attention = current.filter((l) => ["OVERDUE", "DUE_SOON"].includes(getLoanStatus(l)));

  if (isLibrarian) {
    return <EmptyState icon={Library} title="This is the member view" description="Librarians manage every loan from the Loans page." action={<Button asChild><Link to="/manage/loans">Open loan management</Link></Button>} />;
  }

  return (
    <>
      <PageHeader eyebrow="My library" title="My Loans" description="Everything you've borrowed, what's due, and what you've read before." />

      {attention.length > 0 && (
        <div className="mb-8 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-ivory" role="status">
          <strong className="font-medium">Your books due soon:</strong>{" "}
          {attention.map((l, i) => <span key={l.id}>{i > 0 && ", "}{books.get(l.bookId)?.title} <span className={getLoanStatus(l) === "OVERDUE" ? "text-danger" : "text-warning"}>({dueLabel(l)})</span></span>)}
        </div>
      )}

      <Tabs defaultValue="current">
        <TabsList className="mb-6">
          <TabsTrigger value="current">Current ({current.length})</TabsTrigger>
          <TabsTrigger value="reservations">Reservations ({reservations.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {current.length === 0 ? (
            <EmptyState icon={BookOpen} title="You don't have any active loans." description="Find something wonderful in the catalog." action={<Button asChild><Link to="/catalog">Browse catalog</Link></Button>} />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {current.map((loan) => {
                const book = books.get(loan.bookId);
                if (!book) return null;
                const status = getLoanStatus(loan);
                const renew = canRenew(loan);
                return (
                  <li key={loan.id} className={cn("app-card fade-up flex gap-4 p-4", status === "OVERDUE" && "border-danger/40")}>
                    <Link to="/books/$bookId" params={{ bookId: book.id }} className="w-20 shrink-0"><BookCover book={book} size="sm" /></Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link to="/books/$bookId" params={{ bookId: book.id }} className="line-clamp-2 font-display text-xl leading-tight text-ivory hover:text-gold-soft">{book.title}</Link>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <LoanStatusBadge status={status} />
                        <span className={cn("text-xs font-medium", status === "OVERDUE" ? "text-danger" : status === "DUE_SOON" ? "text-warning" : "text-muted-foreground")}>{dueLabel(loan)}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Borrowed {formatDate(loan.borrowedAt)} · Due {formatDate(loan.dueDate)}</p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <span className="text-[11px] text-muted-foreground">Renewals {loan.renewalCount}/{MAX_RENEWALS}</span>
                        <Button size="sm" variant="outline" disabled={!renew.ok} title={renew.reason} onClick={() => actions.renew(loan.id)}><RefreshCw aria-hidden="true" /> Renew</Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="reservations">
          {reservations.length === 0 ? (
            <EmptyState icon={BookmarkCheck} title="No reservations" description="Reserve a borrowed book and we'll notify you the moment it's available." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {reservations.map((r) => {
                const book = books.get(r.bookId);
                if (!book) return null;
                const queue = data.reservations.filter((x) => x.bookId === r.bookId && x.status === "waiting" && x.createdAt < r.createdAt).length;
                return (
                  <li key={r.id} className="app-card flex items-center gap-4 p-4">
                    <BookCover book={book} size="sm" className="w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link to="/books/$bookId" params={{ bookId: book.id }} className="font-display text-lg text-ivory">{book.title}</Link>
                      <p className={cn("text-xs", r.status === "ready" ? "text-success" : "text-info")}>
                        {r.status === "ready" ? "Ready for pickup" : queue === 0 ? "You're next in line" : `${queue} ahead of you`} · reserved {formatDate(r.createdAt)}
                      </p>
                    </div>
                    {r.status === "ready" && book.availableCopies > 0 && <Button size="sm" onClick={() => actions.borrowSelf(book.id)}>Borrow</Button>}
                    <Button size="sm" variant="ghost" onClick={() => actions.cancelReservation(r.id)}>Cancel</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState icon={History} title="No borrowing history yet" description="Books you return will appear here." />
          ) : (
            <>
              <SectionHeader title="Previously borrowed" description="Your history shapes your recommendations." />
              <ul className="divide-y divide-border rounded-xl border border-border">
                {history.map((loan) => {
                  const book = books.get(loan.bookId);
                  if (!book) return null;
                  return (
                    <li key={loan.id} className="flex items-center gap-4 px-4 py-3">
                      <BookCover book={book} size="sm" className="w-10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Link to="/books/$bookId" params={{ bookId: book.id }} className="line-clamp-1 text-ivory hover:text-gold-soft">{book.title}</Link>
                        <p className="text-xs text-muted-foreground">{book.author} · {book.category}</p>
                      </div>
                      <p className="hidden text-right text-xs text-muted-foreground sm:block">{formatDate(loan.borrowedAt)} → {formatDate(loan.returnedAt)}</p>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
