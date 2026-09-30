import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2 } from "lucide-react";
import { useLibrary, useLibraryActions } from "@/services/store";
import { EmptyState, PageHeader } from "@/components/common/Layout";
import { BookCard, BookGrid } from "@/components/books/BookCard";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dates";

export const Route = createFileRoute("/_app/saved")({
  head: () => ({ meta: [{ title: "Saved Books | PageNest" }] }),
  component: SavedPage,
});

function SavedPage() {
  const { data, currentMemberId } = useLibrary();
  const actions = useLibraryActions();
  const books = new Map(data.books.map((b) => [b.id, b]));
  const saved = data.favorites.filter((f) => f.memberId === currentMemberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader eyebrow="My library" title="My Saved Books" description="Books you've set aside for later. We'll show you when they're available." />
      {saved.length === 0 ? (
        <EmptyState icon={Heart} title="Nothing saved yet" description="Tap the heart on any book to keep it here." action={<Button asChild><Link to="/catalog">Browse catalog</Link></Button>} />
      ) : (
        <BookGrid>
          {saved.map((f) => {
            const book = books.get(f.bookId);
            if (!book) return null;
            return (
              <BookCard
                key={f.id}
                book={book}
                footer={
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Saved {formatDate(f.createdAt)}</span>
                    <button type="button" onClick={() => actions.toggleFavorite(book.id)} className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-danger" aria-label={`Remove ${book.title} from saved`}>
                      <Trash2 className="size-3" aria-hidden="true" /> Remove
                    </button>
                  </div>
                }
              />
            );
          })}
        </BookGrid>
      )}
    </>
  );
}
