import { Link } from "@tanstack/react-router";
import { Heart, BookmarkPlus, ArrowRightLeft } from "lucide-react";
import type { Book } from "@/services/types";
import { useLibrary, useLibraryActions } from "@/services/store";
import { bookAvailability } from "@/services/selectors";
import { AvailabilityBadge } from "@/components/common/StatusBadges";
import { BookCover } from "./BookCover";
import { Button } from "@/components/ui/button";
import { useIssueDialog } from "@/features/loans/IssueLoanDialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  book: Book;
  reason?: string;
  className?: string;
  compact?: boolean;
  footer?: ReactNode;
}

export function BookCard({ book, reason, className, compact, footer }: Props) {
  const { data, isLibrarian, currentMemberId } = useLibrary();
  const actions = useLibraryActions();
  const { open: openIssue } = useIssueDialog();
  const availability = bookAvailability(data, book);
  const saved = data.favorites.some((f) => f.memberId === currentMemberId && f.bookId === book.id);
  const hasLoan = data.loans.some((l) => l.memberId === currentMemberId && l.bookId === book.id && !l.returnedAt);
  const reserved = data.reservations.some((r) => r.memberId === currentMemberId && r.bookId === book.id && (r.status === "waiting" || r.status === "ready"));

  return (
    <article className={cn("group book-lift relative flex flex-col", className)}>
      <Link to="/books/$bookId" params={{ bookId: book.id }} className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`${book.title} by ${book.author}`}>
        <BookCover book={book} size={compact ? "sm" : "md"} />
      </Link>
      {!isLibrarian && (
        <button
          type="button"
          onClick={() => actions.toggleFavorite(book.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${book.title} from saved` : `Save ${book.title}`}
          className={cn(
            "absolute top-2 right-2 grid size-8 place-items-center rounded-full border border-white/10 bg-ink/70 backdrop-blur transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            saved ? "text-gold opacity-100" : "text-ivory opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100",
          )}
        >
          <Heart className="size-4" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      )}
      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-[10px] tracking-[.16em] text-gold/80 uppercase">{book.category}</p>
        <Link to="/books/$bookId" params={{ bookId: book.id }} className="mt-1 line-clamp-2 font-display text-lg leading-tight text-ivory hover:text-gold-soft">
          {book.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{book.author}</p>
        {reason && (
          <div className="reason-reveal mt-2" data-open={compact ? "false" : "true"}>
            <p className="rounded-md border border-gold/15 bg-gold/5 px-2 py-1.5 text-[11px] leading-snug text-gold-soft">{reason}</p>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <AvailabilityBadge status={availability} copies={book.availableCopies} />
          {!compact && !footer && (
            isLibrarian ? (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gold hover:text-gold-soft" disabled={availability !== "AVAILABLE"} onClick={() => openIssue({ bookId: book.id })}>
                <ArrowRightLeft aria-hidden="true" /> Issue
              </Button>
            ) : hasLoan ? (
              <span className="text-[11px] text-muted-foreground">On your shelf</span>
            ) : availability === "AVAILABLE" ? (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gold hover:text-gold-soft" onClick={() => actions.borrowSelf(book.id)}>
                Borrow
              </Button>
            ) : availability !== "UNAVAILABLE" && !reserved ? (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-info" onClick={() => actions.reserve(book.id)}>
                <BookmarkPlus aria-hidden="true" /> Reserve
              </Button>
            ) : reserved ? (
              <span className="text-[11px] text-info">Reserved</span>
            ) : null
          )}
        </div>
        {footer}
      </div>
    </article>
  );
}

export function BookGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{children}</div>;
}

export function BookShelf({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="list" aria-label={label} className="scroll-row -mx-1 flex gap-5 overflow-x-auto px-1 pt-2 pb-4">
      {children}
    </div>
  );
}

export function ShelfItem({ children }: { children: ReactNode }) {
  return <div role="listitem" className="w-[150px] shrink-0 sm:w-[170px]">{children}</div>;
}
