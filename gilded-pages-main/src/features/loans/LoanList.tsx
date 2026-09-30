import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BellRing, CalendarPlus, CheckCircle2, Info, MoreHorizontal, RefreshCw, User } from "lucide-react";
import type { Loan } from "@/services/types";
import { useLibrary, useLibraryActions } from "@/services/store";
import { canRenew, dueLabel, getLoanStatus, MAX_RENEWALS } from "@/services/loanRules";
import { indexById } from "@/services/selectors";
import { formatDate, fromInputDate, timeAgo, toInputDate } from "@/utils/dates";
import { LoanStatusBadge } from "@/components/common/StatusBadges";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  loans: Loan[];
  mode: "staff" | "member";
  showMember?: boolean;
  /** Emphasize reminder actions (overdue page). */
  urgent?: boolean;
}

export function LoanList({ loans, mode, showMember = mode === "staff", urgent }: Props) {
  const { data } = useLibrary();
  const books = indexById(data.books);
  const members = indexById(data.members);
  const [extendLoan, setExtendLoan] = useState<Loan | null>(null);
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface/80 text-left text-[10px] tracking-[.16em] text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Book</th>
              {showMember && <th scope="col" className="px-4 py-3 font-medium">Member</th>}
              <th scope="col" className="px-4 py-3 font-medium">Borrowed</th>
              <th scope="col" className="px-4 py-3 font-medium">Due</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loans.map((loan) => {
              const book = books.get(loan.bookId);
              const member = members.get(loan.memberId);
              const status = getLoanStatus(loan);
              return (
                <tr key={loan.id} className="bg-card/30 transition-colors hover:bg-card/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {book && <BookCover book={book} size="sm" className="w-9 shrink-0" />}
                      <div className="min-w-0">
                        {book ? <Link to="/books/$bookId" params={{ bookId: book.id }} className="line-clamp-1 text-ivory hover:text-gold-soft">{book.title}</Link> : "Unknown"}
                        <p className="text-xs text-muted-foreground">{loan.id} · Copy #{loan.copyNumber}</p>
                      </div>
                    </div>
                  </td>
                  {showMember && (
                    <td className="px-4 py-3">
                      {member ? <Link to="/members/$memberId" params={{ memberId: member.id }} className="text-ivory hover:text-gold-soft">{member.name}</Link> : "—"}
                      <p className="text-xs text-muted-foreground">{member?.id.toUpperCase()}</p>
                    </td>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(loan.borrowedAt)}</td>
                  <td className="px-4 py-3">
                    <p className="text-ivory">{formatDate(loan.dueDate)}</p>
                    <p className={cn("text-xs", status === "OVERDUE" ? "text-danger" : status === "DUE_SOON" ? "text-warning" : "text-muted-foreground")}>
                      {loan.returnedAt ? `Returned ${formatDate(loan.returnedAt)}` : dueLabel(loan)}
                    </p>
                  </td>
                  <td className="px-4 py-3"><LoanStatusBadge status={status} /></td>
                  <td className="px-4 py-3 text-right">
                    <LoanActions loan={loan} mode={mode} urgent={urgent} onExtend={setExtendLoan} onDetails={setDetailLoan} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="grid gap-3 md:hidden">
        {loans.map((loan) => {
          const book = books.get(loan.bookId);
          const member = members.get(loan.memberId);
          const status = getLoanStatus(loan);
          return (
            <li key={loan.id} className="app-card flex gap-3 p-3">
              {book && <BookCover book={book} size="sm" className="w-14 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {book && <Link to="/books/$bookId" params={{ bookId: book.id }} className="line-clamp-1 font-display text-lg leading-tight text-ivory">{book.title}</Link>}
                    {showMember && member && <Link to="/members/$memberId" params={{ memberId: member.id }} className="text-xs text-gold-soft">{member.name}</Link>}
                  </div>
                  <LoanActions loan={loan} mode={mode} urgent={urgent} onExtend={setExtendLoan} onDetails={setDetailLoan} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <LoanStatusBadge status={status} />
                  <span className={cn("text-xs", status === "OVERDUE" ? "text-danger" : status === "DUE_SOON" ? "text-warning" : "text-muted-foreground")}>
                    {loan.returnedAt ? `Returned ${formatDate(loan.returnedAt)}` : `Due ${formatDate(loan.dueDate)} · ${dueLabel(loan)}`}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ExtendDialog loan={extendLoan} onClose={() => setExtendLoan(null)} />
      <LoanDetailsDialog loan={detailLoan} onClose={() => setDetailLoan(null)} />
    </>
  );
}

function LoanActions({ loan, mode, urgent, onExtend, onDetails }: { loan: Loan; mode: "staff" | "member"; urgent?: boolean | undefined; onExtend: (l: Loan) => void; onDetails: (l: Loan) => void }) {
  const actions = useLibraryActions();
  const navigate = useNavigate();
  const open = !loan.returnedAt;
  const renew = canRenew(loan);

  if (mode === "member") {
    if (!open) return null;
    return (
      <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!renew.ok} title={renew.reason} onClick={() => actions.renew(loan.id)}>
        <RefreshCw aria-hidden="true" /> Renew
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {open && urgent && (
        <Button size="sm" variant="outline" className="hidden h-8 text-xs lg:inline-flex" onClick={() => actions.remind(loan.id)}>
          <BellRing aria-hidden="true" /> {loan.lastReminderAt ? "Remind again" : "Send reminder"}
        </Button>
      )}
      {open && !urgent && (
        <Button size="sm" variant="ghost" className="hidden h-8 text-xs text-success lg:inline-flex" onClick={() => actions.returnLoan(loan.id)}>
          <CheckCircle2 aria-hidden="true" /> Return
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for loan ${loan.id}`}><MoreHorizontal aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {open && <DropdownMenuItem onSelect={() => actions.returnLoan(loan.id)}><CheckCircle2 /> Mark returned</DropdownMenuItem>}
          {open && <DropdownMenuItem disabled={!renew.ok} onSelect={() => actions.renew(loan.id)}><RefreshCw /> Renew ({loan.renewalCount}/{MAX_RENEWALS})</DropdownMenuItem>}
          {open && <DropdownMenuItem onSelect={() => onExtend(loan)}><CalendarPlus /> Extend due date</DropdownMenuItem>}
          {open && <DropdownMenuItem onSelect={() => actions.remind(loan.id)}><BellRing /> Send reminder</DropdownMenuItem>}
          {open && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => onDetails(loan)}><Info /> Loan details</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate({ to: "/members/$memberId", params: { memberId: loan.memberId } })}><User /> View member</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ExtendDialog({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(loan)} onOpenChange={(o) => !o && onClose()}>
      {loan && <ExtendForm key={loan.id} loan={loan} onClose={onClose} />}
    </Dialog>
  );
}

function ExtendForm({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const actions = useLibraryActions();
  const [value, setValue] = useState(toInputDate(loan.dueDate));
  return (
    <DialogContent className="sm:max-w-sm">
      <form onSubmit={(e) => { e.preventDefault(); if (value && actions.extend(loan.id, fromInputDate(value))) onClose(); }}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Extend due date</DialogTitle>
          <DialogDescription>Currently due {formatDate(loan.dueDate)}. Extending doesn't count as a renewal.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid gap-1.5">
          <Label htmlFor="extend-date">New due date</Label>
          <Input id="extend-date" type="date" value={value} min={toInputDate(new Date().toISOString())} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <DialogFooter className="mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function LoanDetailsDialog({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  const { data } = useLibrary();
  const book = loan && data.books.find((b) => b.id === loan.bookId);
  const member = loan && data.members.find((m) => m.id === loan.memberId);
  const rows: [string, string][] = loan
    ? [
        ["Loan ID", loan.id],
        ["Member", member ? `${member.name} (${member.id.toUpperCase()})` : "—"],
        ["Book", book?.title ?? "—"],
        ["Copy", `#${loan.copyNumber}`],
        ["Borrowed", formatDate(loan.borrowedAt)],
        ["Due", `${formatDate(loan.dueDate)} · ${dueLabel(loan)}`],
        ["Returned", formatDate(loan.returnedAt)],
        ["Renewals", `${loan.renewalCount} of ${MAX_RENEWALS}`],
        ["Last reminder", loan.lastReminderAt ? timeAgo(loan.lastReminderAt) : "None sent"],
      ]
    : [];
  return (
    <Dialog open={Boolean(loan)} onOpenChange={(o) => !o && onClose()}>
      {loan && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 font-display text-2xl font-medium">Loan details <LoanStatusBadge status={getLoanStatus(loan)} /></DialogTitle>
            <DialogDescription className="sr-only">Full loan record</DialogDescription>
          </DialogHeader>
          <dl className="mt-2 divide-y divide-border text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right text-ivory">{v}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      )}
    </Dialog>
  );
}
