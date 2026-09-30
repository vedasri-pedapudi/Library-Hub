import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Ban, CheckCircle2, MoreHorizontal, PackagePlus, Pencil, Plus, Search, ArrowRightLeft, BookX } from "lucide-react";
import type { Book } from "@/services/types";
import { useLibrary, useLibraryActions } from "@/services/store";
import { bookAvailability, categories } from "@/services/selectors";
import { BookCover } from "@/components/books/BookCover";
import { AvailabilityBadge } from "@/components/common/StatusBadges";
import { EmptyState, PageHeader } from "@/components/common/Layout";
import { BookFormDialog } from "@/features/catalog/BookFormDialog";
import { useIssueDialog } from "@/features/loans/IssueLoanDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/manage/books")({
  head: () => ({ meta: [{ title: "Books | PageNest" }] }),
  component: ManageBooks,
});

function ManageBooks() {
  const { data } = useLibrary();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Book | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const rows = data.books
    .filter((b) => (showArchived ? b.archived : !b.archived))
    .filter((b) => cat === "all" || b.category === cat)
    .filter((b) => { const t = q.trim().toLowerCase(); return !t || `${b.title} ${b.author} ${b.isbn}`.toLowerCase().includes(t); })
    .sort((a, b) => a.title.localeCompare(b.title));

  const openForm = (b?: Book) => { setEditing(b); setFormOpen(true); };

  return (
    <>
      <PageHeader eyebrow="Collection" title="Books Management" description="Add titles, manage physical copies and control availability." actions={<Button onClick={() => openForm()}><Plus aria-hidden="true" /> Add book</Button>} />
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, author or ISBN…" className="h-11 rounded-full pl-10" aria-label="Search books" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-11 w-full rounded-full md:w-52" aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{categories(data).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant={showArchived ? "secondary" : "outline"} className="h-11 rounded-full" onClick={() => setShowArchived((s) => !s)} aria-pressed={showArchived}><Archive aria-hidden="true" /> {showArchived ? "Showing archived" : "Archived"}</Button>
      </div>

      {rows.length === 0 ? <EmptyState icon={BookX} title={showArchived ? "No archived books" : "No books found matching your search."} /> : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((b) => <BookRow key={b.id} book={b} onEdit={() => openForm(b)} />)}
        </ul>
      )}
      <BookFormDialog open={formOpen} onOpenChange={setFormOpen} book={editing} />
    </>
  );
}

function BookRow({ book, onEdit }: { book: Book; onEdit: () => void }) {
  const { data } = useLibrary();
  const actions = useLibraryActions();
  const { open: openIssue } = useIssueDialog();
  const availability = bookAvailability(data, book);
  const onLoan = book.totalCopies - book.availableCopies;
  return (
    <li className="app-card flex gap-4 p-4">
      <Link to="/books/$bookId" params={{ bookId: book.id }} className="w-16 shrink-0"><BookCover book={book} size="sm" /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to="/books/$bookId" params={{ bookId: book.id }} className="line-clamp-1 font-display text-lg text-ivory hover:text-gold-soft">{book.title}</Link>
            <p className="truncate text-xs text-muted-foreground">{book.author} · {book.category}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label={`Manage ${book.title}`}><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onEdit}><Pencil /> Edit details</DropdownMenuItem>
              <DropdownMenuItem disabled={availability !== "AVAILABLE"} onSelect={() => openIssue({ bookId: book.id })}><ArrowRightLeft /> Issue book</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.addCopies(book.id, 1)}><PackagePlus /> Add a copy</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.editBook(book.id, { unavailable: !book.unavailable })}>{book.unavailable ? <><CheckCircle2 /> Return to circulation</> : <><Ban /> Mark unavailable</>}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => actions.archive(book.id, !book.archived)} className={book.archived ? "" : "text-danger"}>{book.archived ? <><ArchiveRestore /> Restore</> : <><Archive /> Archive</>}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">ISBN {book.isbn} · {book.publicationYear} · {book.language}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <AvailabilityBadge status={availability} />
          <span className="text-xs text-muted-foreground"><span className="text-ivory">{book.availableCopies}</span> on shelf · {onLoan} on loan · {book.totalCopies} total</span>
        </div>
        {/* Copy strip: one pip per physical copy */}
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: book.totalCopies }, (_, i) => <span key={i} className={`h-1.5 w-5 rounded-full ${i < book.availableCopies && !book.unavailable ? "bg-success/70" : "bg-warning/60"}`} />)}
        </div>
      </div>
    </li>
  );
}
