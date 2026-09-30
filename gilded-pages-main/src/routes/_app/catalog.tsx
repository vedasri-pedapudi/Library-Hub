import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, List, Plus, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useLibrary } from "@/services/store";
import { activeBooks, bookAvailability, borrowCounts, categories } from "@/services/selectors";
import type { Availability } from "@/services/loanRules";
import { BookCard, BookGrid } from "@/components/books/BookCard";
import { BookCover } from "@/components/books/BookCover";
import { AvailabilityBadge } from "@/components/common/StatusBadges";
import { EmptyState, PageHeader } from "@/components/common/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { BookFormDialog } from "@/features/catalog/BookFormDialog";

const SORTS = { relevance: "Relevance", newest: "Newest", borrowed: "Most borrowed", title: "Title A–Z", author: "Author A–Z" } as const;
type Sort = keyof typeof SORTS;

interface CatalogSearch {
  q?: string;
  genre?: string;
  sort?: Sort;
}

export const Route = createFileRoute("/_app/catalog")({
  validateSearch: (s: Record<string, unknown>): CatalogSearch => ({
    ...(typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
    ...(typeof s["genre"] === "string" && s["genre"] ? { genre: s["genre"] } : {}),
    ...(typeof s["sort"] === "string" && s["sort"] in SORTS ? { sort: s["sort"] as Sort } : {}),
  }),
  head: () => ({ meta: [{ title: "Catalog | PageNest" }] }),
  component: CatalogPage,
});

const ALL = "__all";

function CatalogPage() {
  const { data, isLibrarian } = useLibrary();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalog" });
  const [author, setAuthor] = useState(ALL);
  const [availability, setAvailability] = useState<Availability | typeof ALL>(ALL);
  const [language, setLanguage] = useState(ALL);
  const [era, setEra] = useState(ALL);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);

  const q = search.q ?? "";
  const genre = search.genre ?? ALL;
  const sort: Sort = search.sort ?? "relevance";
  const setSearch = (patch: Partial<CatalogSearch>) =>
    navigate({ search: (prev) => { const next = { ...prev, ...patch }; (Object.keys(next) as (keyof CatalogSearch)[]).forEach((k) => { if (!next[k] || next[k] === ALL) delete next[k]; }); return next; }, replace: true });

  const all = activeBooks(data);
  const authors = useMemo(() => [...new Set(all.map((b) => b.author))].sort(), [all]);
  const languages = useMemo(() => [...new Set(all.map((b) => b.language))].sort(), [all]);
  const counts = useMemo(() => borrowCounts(data), [data]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const scored = all
      .map((b) => {
        let score = 0;
        if (term) {
          if (b.title.toLowerCase().includes(term)) score += 5;
          if (b.author.toLowerCase().includes(term)) score += 4;
          if (b.isbn.includes(term.replace(/-/g, ""))) score += 6;
          if (b.category.toLowerCase().includes(term)) score += 3;
          if (b.keywords.some((k) => k.includes(term))) score += 2;
          if (b.description.toLowerCase().includes(term)) score += 1;
        }
        return { b, score };
      })
      .filter(({ b, score }) => {
        if (term && score === 0) return false;
        if (genre !== ALL && b.category !== genre) return false;
        if (author !== ALL && b.author !== author) return false;
        if (language !== ALL && b.language !== language) return false;
        if (availability !== ALL && bookAvailability(data, b) !== availability) return false;
        if (era !== ALL) {
          const y = b.publicationYear;
          if (era === "2020" && y < 2020) return false;
          if (era === "2010" && (y < 2010 || y >= 2020)) return false;
          if (era === "2000" && (y < 2000 || y >= 2010)) return false;
          if (era === "old" && y >= 2000) return false;
        }
        return true;
      });
    const cmp: Record<Sort, (x: typeof scored[number], y: typeof scored[number]) => number> = {
      relevance: (x, y) => y.score - x.score || (counts.get(y.b.id) ?? 0) - (counts.get(x.b.id) ?? 0),
      newest: (x, y) => y.b.addedAt.localeCompare(x.b.addedAt),
      borrowed: (x, y) => (counts.get(y.b.id) ?? 0) - (counts.get(x.b.id) ?? 0),
      title: (x, y) => x.b.title.localeCompare(y.b.title),
      author: (x, y) => x.b.author.localeCompare(y.b.author),
    };
    return scored.sort(cmp[sort]).map((s) => s.b);
  }, [all, q, genre, author, language, availability, era, sort, counts, data]);

  const activeFilters = [genre, author, availability, language, era].filter((f) => f !== ALL).length;
  const clearAll = () => { setAuthor(ALL); setAvailability(ALL); setLanguage(ALL); setEra(ALL); setSearch({ genre: ALL, q: "" }); };

  const filters = (
    <div className="grid gap-4">
      <FilterSelect label="Genre" value={genre} onChange={(v) => setSearch({ genre: v })} options={categories(data)} />
      <FilterSelect label="Author" value={author} onChange={setAuthor} options={authors} />
      <FilterSelect label="Availability" value={availability} onChange={(v) => setAvailability(v as Availability)} options={["AVAILABLE", "BORROWED", "RESERVED", "UNAVAILABLE"]} labels={{ AVAILABLE: "Available", BORROWED: "Borrowed", RESERVED: "Reserved", UNAVAILABLE: "Unavailable" }} />
      <FilterSelect label="Published" value={era} onChange={setEra} options={["2020", "2010", "2000", "old"]} labels={{ "2020": "2020 and later", "2010": "2010 – 2019", "2000": "2000 – 2009", old: "Before 2000" }} />
      <FilterSelect label="Language" value={language} onChange={setLanguage} options={languages} />
      {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={clearAll} className="justify-start text-muted-foreground"><X aria-hidden="true" /> Clear filters</Button>}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="The collection"
        title="Book Catalog"
        description={`${all.length} titles · ${all.reduce((s, b) => s + b.totalCopies, 0)} physical copies across ${categories(data).length} categories.`}
        actions={isLibrarian && <Button onClick={() => setAddOpen(true)}><Plus aria-hidden="true" /> Add book</Button>}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setSearch({ q: e.target.value })} placeholder="Search by title, author, ISBN, category or keyword…" className="h-11 rounded-full pl-10" aria-label="Search the catalog" />
        </div>
        <div className="flex gap-2">
          <Select value={sort} onValueChange={(v) => setSearch({ sort: v as Sort })}>
            <SelectTrigger className="h-11 w-44 rounded-full" aria-label="Sort by"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(SORTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 rounded-full lg:hidden"><SlidersHorizontal aria-hidden="true" /> Filters{activeFilters > 0 && ` (${activeFilters})`}</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader><SheetTitle className="font-display text-2xl font-medium">Filters</SheetTitle></SheetHeader>
              <div className="px-4">{filters}</div>
            </SheetContent>
          </Sheet>
          <div className="hidden rounded-full border border-border p-1 sm:flex" role="group" aria-label="View">
            <Button size="icon" variant={view === "grid" ? "secondary" : "ghost"} className="size-9 rounded-full" onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Grid view"><LayoutGrid aria-hidden="true" /></Button>
            <Button size="icon" variant={view === "list" ? "secondary" : "ghost"} className="size-9 rounded-full" onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view"><List aria-hidden="true" /></Button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block" aria-label="Filters">
          <div className="sticky top-28">
            <p className="mb-4 text-[10px] font-semibold tracking-[.24em] text-muted-foreground uppercase">Refine</p>
            {filters}
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <p className="mb-5 text-xs text-muted-foreground" aria-live="polite">{results.length} {results.length === 1 ? "book" : "books"}{q && <> matching “{q}”</>}</p>
          {results.length === 0 ? (
            <EmptyState icon={SearchX} title="No books found matching your search." description="Try a different keyword, or clear some filters." action={<Button variant="outline" onClick={clearAll}>Clear search & filters</Button>} />
          ) : view === "grid" ? (
            <BookGrid>{results.map((b) => <BookCard key={b.id} book={b} />)}</BookGrid>
          ) : (
            <ul className="grid gap-3">
              {results.map((b) => (
                <li key={b.id} className="app-card flex gap-4 p-3 transition-colors hover:border-gold/40">
                  <BookCover book={b} size="sm" className="w-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] tracking-[.16em] text-gold/80 uppercase">{b.category} · {b.publicationYear}</p>
                    <Link to="/books/$bookId" params={{ bookId: b.id }} className="font-display text-xl text-ivory hover:text-gold-soft">{b.title}</Link>
                    <p className="text-xs text-muted-foreground">{b.author} · {b.language} · ISBN {b.isbn}</p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                    <AvailabilityBadge status={bookAvailability(data, b)} copies={b.availableCopies} />
                    <span className="text-xs text-muted-foreground">{b.availableCopies}/{b.totalCopies} copies</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {isLibrarian && <BookFormDialog open={addOpen} onOpenChange={setAddOpen} />}
    </>
  );
}

function FilterSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{labels?.[o] ?? o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
