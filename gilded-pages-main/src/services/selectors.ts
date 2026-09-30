// Read-only queries over library data. Pure functions — easy to move server-side later.
import type { Book, LibraryData, Loan, Member } from "./types";
import { daysOverdue, getAvailability, getLoanStatus, isOpen, type Availability } from "./loanRules";
import { daysBetween } from "@/utils/dates";

export const indexById = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]));

export function openLoans(data: LibraryData): Loan[] {
  return data.loans.filter(isOpen);
}

export function overdueLoans(data: LibraryData, now = new Date()): Loan[] {
  return openLoans(data)
    .filter((l) => getLoanStatus(l, now) === "OVERDUE")
    .sort((a, b) => daysOverdue(b, now) - daysOverdue(a, now));
}

export function dueSoonLoans(data: LibraryData, now = new Date()): Loan[] {
  return openLoans(data)
    .filter((l) => getLoanStatus(l, now) === "DUE_SOON")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function waitingReservationCount(data: LibraryData, bookId: string): number {
  return data.reservations.filter((r) => r.bookId === bookId && r.status === "waiting").length;
}

export function bookAvailability(data: LibraryData, book: Book): Availability {
  return getAvailability(book, waitingReservationCount(data, book.id));
}

export function activeBooks(data: LibraryData): Book[] {
  return data.books.filter((b) => !b.archived);
}

/** Loan counts per book, optionally limited to the last `days` days. */
export function borrowCounts(data: LibraryData, days?: number, now = new Date()): Map<string, number> {
  const counts = new Map<string, number>();
  for (const loan of data.loans) {
    if (days !== undefined && daysBetween(loan.borrowedAt, now) > days) continue;
    counts.set(loan.bookId, (counts.get(loan.bookId) ?? 0) + 1);
  }
  return counts;
}

export function popularBooks(data: LibraryData, limit = 10, days?: number): Book[] {
  const counts = borrowCounts(data, days);
  return activeBooks(data)
    .filter((b) => counts.has(b.id))
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, limit);
}

export function newArrivals(data: LibraryData, limit = 10): Book[] {
  return [...activeBooks(data)].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, limit);
}

export function memberLoans(data: LibraryData, memberId: string) {
  const loans = data.loans.filter((l) => l.memberId === memberId);
  return {
    current: loans.filter(isOpen).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    history: loans.filter((l) => !isOpen(l)).sort((a, b) => (b.returnedAt ?? "").localeCompare(a.returnedAt ?? "")),
    all: loans,
  };
}

export interface MemberSummary {
  member: Member;
  current: number;
  overdue: number;
  total: number;
  lastActivity: string | null;
}

export function memberSummaries(data: LibraryData, now = new Date()): MemberSummary[] {
  const lastActivity = new Map<string, string>();
  for (const a of data.activities) {
    if (!a.memberId) continue;
    const prev = lastActivity.get(a.memberId);
    if (!prev || a.timestamp > prev) lastActivity.set(a.memberId, a.timestamp);
  }
  return data.members.map((member) => {
    const loans = data.loans.filter((l) => l.memberId === member.id);
    const open = loans.filter(isOpen);
    return {
      member,
      current: open.length,
      overdue: open.filter((l) => getLoanStatus(l, now) === "OVERDUE").length,
      total: loans.length,
      lastActivity: lastActivity.get(member.id) ?? null,
    };
  });
}

export interface ReadingProfile {
  categories: { name: string; count: number }[];
  authors: { name: string; count: number }[];
  avgLoanDays: number | null;
  booksPerMonth: number;
}

export function readingProfile(data: LibraryData, memberId: string): ReadingProfile {
  const books = indexById(data.books);
  const loans = data.loans.filter((l) => l.memberId === memberId);
  const cat = new Map<string, number>();
  const auth = new Map<string, number>();
  for (const l of loans) {
    const b = books.get(l.bookId);
    if (!b) continue;
    cat.set(b.category, (cat.get(b.category) ?? 0) + 1);
    auth.set(b.author, (auth.get(b.author) ?? 0) + 1);
  }
  const toList = (m: Map<string, number>) => [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const returned = loans.filter((l) => l.returnedAt);
  const avgLoanDays = returned.length ? Math.round(returned.reduce((s, l) => s + daysBetween(l.borrowedAt, l.returnedAt as string), 0) / returned.length) : null;
  const first = loans.reduce<string | null>((min, l) => (!min || l.borrowedAt < min ? l.borrowedAt : min), null);
  const months = first ? Math.max(1, daysBetween(first, new Date()) / 30) : 1;
  return { categories: toList(cat), authors: toList(auth), avgLoanDays, booksPerMonth: Math.round((loans.length / months) * 10) / 10 };
}

export function categories(data: LibraryData): string[] {
  return [...new Set(activeBooks(data).map((b) => b.category))].sort();
}

export function libraryStats(data: LibraryData, now = new Date()) {
  const open = openLoans(data);
  const overdue = open.filter((l) => getLoanStatus(l, now) === "OVERDUE");
  const books = activeBooks(data);
  return {
    totalBooks: books.length,
    totalCopies: books.reduce((s, b) => s + b.totalCopies, 0),
    availableCopies: books.reduce((s, b) => s + (b.unavailable ? 0 : b.availableCopies), 0),
    activeMembers: data.members.filter((m) => m.membershipStatus === "active").length,
    activeLoans: open.length,
    overdue: overdue.length,
    membersWithOverdue: new Set(overdue.map((l) => l.memberId)).size,
    dueSoon: open.filter((l) => getLoanStatus(l, now) === "DUE_SOON").length,
    returnedThisWeek: data.loans.filter((l) => l.returnedAt && daysBetween(l.returnedAt, now) <= 7).length,
    newMembers: data.members.filter((m) => daysBetween(m.joinedAt, now) <= 30).length,
    borrowedThisWeek: data.loans.filter((l) => daysBetween(l.borrowedAt, now) <= 7).length,
    categories: new Set(books.map((b) => b.category)).size,
  };
}
