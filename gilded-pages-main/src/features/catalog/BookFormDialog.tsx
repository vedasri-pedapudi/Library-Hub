import { useState } from "react";
import type { Book } from "@/services/types";
import { useLibrary, useLibraryActions } from "@/services/store";
import { categories } from "@/services/selectors";
import { coverUrl } from "@/services/seed";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCover } from "@/components/books/BookCover";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book | undefined;
}

export function BookFormDialog({ open, onOpenChange, book }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <BookForm key={book?.id ?? "new"} book={book} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function BookForm({ book, onDone }: { book?: Book | undefined; onDone: () => void }) {
  const { data } = useLibrary();
  const actions = useLibraryActions();
  const [form, setForm] = useState({
    title: book?.title ?? "",
    author: book?.author ?? "",
    isbn: book?.isbn ?? "",
    description: book?.description ?? "",
    category: book?.category ?? "",
    keywords: book?.keywords.join(", ") ?? "",
    publicationYear: String(book?.publicationYear ?? new Date().getFullYear()),
    publisher: book?.publisher ?? "",
    language: book?.language ?? "English",
    coverImage: book?.coverImage ?? "",
    totalCopies: String(book?.totalCopies ?? 1),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onLoan = book ? book.totalCopies - book.availableCopies : 0;
  const cleanIsbn = form.isbn.replace(/[^0-9X]/gi, "");
  const cover = form.coverImage || (cleanIsbn.length >= 10 ? coverUrl(cleanIsbn) : "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: cleanIsbn,
      description: form.description.trim(),
      category: form.category.trim(),
      keywords: form.keywords.split(/[,\s]+/).map((k) => k.trim().toLowerCase()).filter(Boolean),
      publicationYear: Number(form.publicationYear) || new Date().getFullYear(),
      publisher: form.publisher.trim(),
      language: form.language.trim() || "English",
      coverImage: cover,
      totalCopies: Math.max(0, Number(form.totalCopies) || 0),
    };
    const ok = book ? actions.editBook(book.id, payload) : actions.addBook(payload);
    if (ok) onDone();
  };

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
      <form onSubmit={submit}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">{book ? "Edit book" : "Add a book"}</DialogTitle>
          <DialogDescription>{book ? "Changes apply immediately across the catalog." : "Members interested in this category will be notified."}</DialogDescription>
        </DialogHeader>
        <div className="mt-5 grid gap-5 sm:grid-cols-[140px_1fr]">
          <div className="hidden sm:block">
            <BookCover key={cover} book={{ title: form.title || "Untitled", author: form.author || "Author", coverImage: cover }} />
            <p className="mt-2 text-[11px] text-muted-foreground">Cover is fetched from the ISBN when no image URL is given.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="bf-title" label="Title" className="sm:col-span-2"><Input id="bf-title" value={form.title} onChange={set("title")} required /></Field>
            <Field id="bf-author" label="Author"><Input id="bf-author" value={form.author} onChange={set("author")} required list="bf-authors" /></Field>
            <Field id="bf-isbn" label="ISBN"><Input id="bf-isbn" value={form.isbn} onChange={set("isbn")} required inputMode="numeric" /></Field>
            <Field id="bf-category" label="Category"><Input id="bf-category" value={form.category} onChange={set("category")} required list="bf-categories" /></Field>
            <Field id="bf-year" label="Publication year"><Input id="bf-year" type="number" value={form.publicationYear} onChange={set("publicationYear")} min={1400} max={2100} /></Field>
            <Field id="bf-publisher" label="Publisher"><Input id="bf-publisher" value={form.publisher} onChange={set("publisher")} /></Field>
            <Field id="bf-language" label="Language"><Input id="bf-language" value={form.language} onChange={set("language")} /></Field>
            <Field id="bf-copies" label="Total copies" hint={onLoan ? `${onLoan} currently on loan` : undefined}><Input id="bf-copies" type="number" min={onLoan} value={form.totalCopies} onChange={set("totalCopies")} required /></Field>
            <Field id="bf-cover" label="Cover image URL (optional)"><Input id="bf-cover" value={form.coverImage} onChange={set("coverImage")} placeholder="https://…" /></Field>
            <Field id="bf-keywords" label="Keywords" className="sm:col-span-2" hint="Used by the recommendation engine to find similar books."><Input id="bf-keywords" value={form.keywords} onChange={set("keywords")} placeholder="space, survival, humor" /></Field>
            <Field id="bf-desc" label="Description" className="sm:col-span-2"><Textarea id="bf-desc" value={form.description} onChange={set("description")} rows={3} /></Field>
          </div>
        </div>
        <datalist id="bf-categories">{categories(data).map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="bf-authors">{[...new Set(data.books.map((b) => b.author))].map((a) => <option key={a} value={a} />)}</datalist>
        <DialogFooter className="mt-6">
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit">{book ? "Save changes" : "Add to catalog"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ id, label, hint, className, children }: { id: string; label: string; hint?: string | undefined; className?: string; children: React.ReactNode }) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
