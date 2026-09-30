// "Select member + select available book + set due date = create loan".
// Mounted once at the root; any component can open it via useIssueDialog().
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLibrary, useLibraryActions } from "@/services/store";
import { activeBooks } from "@/services/selectors";
import { defaultDueDate } from "@/services/libraryService";
import { LOAN_PERIOD_DAYS } from "@/services/loanRules";
import { fromInputDate, toInputDate } from "@/utils/dates";
import { BookCover } from "@/components/books/BookCover";

interface OpenArgs {
  bookId?: string;
  memberId?: string;
}

const IssueContext = createContext<{ open: (args?: OpenArgs) => void }>({ open: () => {} });

export function useIssueDialog() {
  return useContext(IssueContext);
}

export function IssueDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; args: OpenArgs; key: number }>({ open: false, args: {}, key: 0 });
  const open = useCallback((args: OpenArgs = {}) => setState((s) => ({ open: true, args, key: s.key + 1 })), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <IssueContext.Provider value={value}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
        {state.open && <IssueForm key={state.key} initial={state.args} onDone={() => setState((s) => ({ ...s, open: false }))} />}
      </Dialog>
    </IssueContext.Provider>
  );
}

function IssueForm({ initial, onDone }: { initial: OpenArgs; onDone: () => void }) {
  const { data } = useLibrary();
  const actions = useLibraryActions();
  const [memberId, setMemberId] = useState(initial.memberId ?? "");
  const [bookId, setBookId] = useState(initial.bookId ?? "");
  const [due, setDue] = useState(toInputDate(defaultDueDate()));

  const members = data.members.filter((m) => m.membershipStatus === "active").sort((a, b) => a.name.localeCompare(b.name));
  const books = activeBooks(data).filter((b) => !b.unavailable && (b.availableCopies > 0 || b.id === initial.bookId)).sort((a, b) => a.title.localeCompare(b.title));
  const book = data.books.find((b) => b.id === bookId);
  const memberOverdue = data.loans.filter((l) => l.memberId === memberId && !l.returnedAt && new Date(l.dueDate) < new Date()).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !bookId) return;
    if (actions.issue(memberId, bookId, fromInputDate(due))) onDone();
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <form onSubmit={submit}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Issue a book</DialogTitle>
          <DialogDescription>Availability updates automatically. Standard loan period is {LOAN_PERIOD_DAYS} days.</DialogDescription>
        </DialogHeader>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="issue-member">Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="issue-member"><SelectValue placeholder="Select a member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.id.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            {memberOverdue > 0 && <p className="text-xs text-warning">Heads up: this member has {memberOverdue} overdue book{memberOverdue === 1 ? "" : "s"}.</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="issue-book">Available book</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger id="issue-book"><SelectValue placeholder="Select a book" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {books.map((b) => <SelectItem key={b.id} value={b.id}>{b.title} — {b.availableCopies} available</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {book && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3">
              <BookCover book={book} size="sm" className="w-10 shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="truncate text-ivory">{book.title}</p>
                <p className="text-xs text-muted-foreground">{book.author} · {book.availableCopies} of {book.totalCopies} copies available</p>
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="issue-due">Due date</Label>
            <Input id="issue-due" type="date" value={due} min={toInputDate(new Date().toISOString())} onChange={(e) => setDue(e.target.value)} required />
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit" disabled={!memberId || !bookId || (book?.availableCopies ?? 0) <= 0}>Create loan</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
