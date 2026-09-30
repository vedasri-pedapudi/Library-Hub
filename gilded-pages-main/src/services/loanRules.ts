// Deterministic business rules for loans. No AI here — overdue and due-soon
// tracking must be predictable and auditable.
import type { Book, Loan, LoanStatus } from "./types";
import { daysBetween } from "@/utils/dates";

export const LOAN_PERIOD_DAYS = 14;
export const RENEWAL_DAYS = 14;
export const MAX_RENEWALS = 2;
export const DUE_SOON_WINDOW_DAYS = 3;

export function isOpen(loan: Loan): boolean {
  return loan.returnedAt === null;
}

/** Negative = overdue by that many days. */
export function daysUntilDue(loan: Loan, now: Date = new Date()): number {
  return daysBetween(now, loan.dueDate);
}

export function daysOverdue(loan: Loan, now: Date = new Date()): number {
  if (!isOpen(loan)) return 0;
  return Math.max(0, -daysUntilDue(loan, now));
}

/**
 * current date > due date AND no return date → OVERDUE
 * due within DUE_SOON_WINDOW_DAYS → DUE_SOON
 */
export function getLoanStatus(loan: Loan, now: Date = new Date()): LoanStatus {
  if (!isOpen(loan)) return "RETURNED";
  const left = daysUntilDue(loan, now);
  if (left < 0) return "OVERDUE";
  if (left <= DUE_SOON_WINDOW_DAYS) return "DUE_SOON";
  return loan.status === "renewed" ? "RENEWED" : "ACTIVE";
}

export function dueLabel(loan: Loan, now: Date = new Date()): string {
  if (!isOpen(loan)) return "Returned";
  const left = daysUntilDue(loan, now);
  if (left < 0) return `${-left} day${left === -1 ? "" : "s"} overdue`;
  if (left === 0) return "Due today";
  if (left === 1) return "1 day left";
  return `${left} days left`;
}

export function canRenew(loan: Loan, now: Date = new Date()): { ok: boolean; reason?: string } {
  if (!isOpen(loan)) return { ok: false, reason: "Loan already returned" };
  if (loan.renewalCount >= MAX_RENEWALS) return { ok: false, reason: `Renewal limit (${MAX_RENEWALS}) reached` };
  if (daysOverdue(loan, now) > 14) return { ok: false, reason: "More than 14 days overdue" };
  return { ok: true };
}

export type Availability = "AVAILABLE" | "BORROWED" | "RESERVED" | "UNAVAILABLE";

export function getAvailability(book: Book, waitingReservations: number): Availability {
  if (book.archived || book.unavailable || book.totalCopies === 0) return "UNAVAILABLE";
  if (book.availableCopies > 0) return "AVAILABLE";
  return waitingReservations > 0 ? "RESERVED" : "BORROWED";
}

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  ACTIVE: "Active",
  DUE_SOON: "Due soon",
  OVERDUE: "Overdue",
  RETURNED: "Returned",
  RENEWED: "Renewed",
};
