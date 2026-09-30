import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Clock, PenLine, Search, User, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLibrary } from "@/services/store";
import { activeBooks } from "@/services/selectors";
import { BookCover } from "@/components/books/BookCover";

const RECENT_KEY = "pagenest:recent-searches";

const SearchContext = createContext<{ open: () => void }>({ open: () => {} });
export const useGlobalSearch = () => useContext(SearchContext);

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openFn = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open: openFn }), [openFn]);
  return (
    <SearchContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search the library</DialogTitle>
          <DialogDescription className="sr-only">Search books, authors, ISBNs{""} and members</DialogDescription>
          {open && <SearchPanel onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </SearchContext.Provider>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const { data, isLibrarian } = useLibrary();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return { books: [], authors: [], members: [] };
    const books = activeBooks(data).filter((b) =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.replace(/-/g, "").includes(q.replace(/-/g, "")) || b.category.toLowerCase().includes(q) || b.keywords.some((k) => k.includes(q)),
    ).slice(0, 7);
    const authors = [...new Set(activeBooks(data).map((b) => b.author))].filter((a) => a.toLowerCase().includes(q)).slice(0, 4);
    // Member records are staff-only information.
    const members = isLibrarian ? data.members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.id.toLowerCase() === q).slice(0, 5) : [];
    return { books, authors, members };
  }, [q, data, isLibrarian]);

  const remember = (term: string) => {
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const go = (fn: () => void) => {
    if (q) remember(query.trim());
    fn();
    onClose();
  };

  return (
    <Command shouldFilter={false} className="bg-popover">
      <CommandInput value={query} onValueChange={setQuery} placeholder={isLibrarian ? "Search books, authors, ISBNs, members…" : "Search books, authors, ISBNs…"} />
      <CommandList className="max-h-[60vh]">
        {!q && recent.length > 0 && (
          <CommandGroup heading="Recent searches">
            {recent.map((r) => (
              <CommandItem key={r} value={`recent-${r}`} onSelect={() => setQuery(r)}>
                <Clock className="text-muted-foreground" /> <span className="flex-1">{r}</span>
                <button type="button" aria-label={`Remove ${r}`} className="rounded p-0.5 text-muted-foreground hover:text-ivory" onClick={(e) => { e.stopPropagation(); const next = recent.filter((x) => x !== r); setRecent(next); localStorage.setItem(RECENT_KEY, JSON.stringify(next)); }}>
                  <X className="size-3" />
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!q && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            <Search className="mx-auto mb-2 size-4" aria-hidden="true" />
            Type to search. Press <kbd className="rounded border border-border px-1">↵</kbd> to open, <kbd className="rounded border border-border px-1">Esc</kbd> to close.
          </div>
        )}
        {q && <CommandEmpty>No books found matching your search.</CommandEmpty>}
        {results.books.length > 0 && (
          <CommandGroup heading="Books">
            {results.books.map((b) => (
              <CommandItem key={b.id} value={`book-${b.id}`} onSelect={() => go(() => navigate({ to: "/books/$bookId", params: { bookId: b.id } }))}>
                <BookCover book={b} size="sm" className="w-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ivory">{b.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.author} · ISBN {b.isbn}</p>
                </div>
                <BookOpen className="text-muted-foreground" />
              </CommandItem>
            ))}
            <CommandItem value="see-all" onSelect={() => go(() => navigate({ to: "/catalog", search: { q: query.trim() } }))}>
              <Search /> See all results for “{query.trim()}”
            </CommandItem>
          </CommandGroup>
        )}
        {results.authors.length > 0 && (
          <CommandGroup heading="Authors">
            {results.authors.map((a) => (
              <CommandItem key={a} value={`author-${a}`} onSelect={() => go(() => navigate({ to: "/catalog", search: { q: a } }))}>
                <PenLine className="text-muted-foreground" /> {a}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.members.length > 0 && (
          <CommandGroup heading="Members">
            {results.members.map((m) => (
              <CommandItem key={m.id} value={`member-${m.id}`} onSelect={() => go(() => navigate({ to: "/members/$memberId", params: { memberId: m.id } }))}>
                <User className="text-muted-foreground" />
                <span className="flex-1">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.id.toUpperCase()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
