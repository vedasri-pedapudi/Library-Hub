// Write operations. Each is a pure (data, input) → { data, ...result } function,
// matching the endpoints a real API would expose (POST /loans, PATCH /loans/:id, …).
// The store calls these; a backend adapter could call fetch() instead.
import type { Activity, Book, LibraryData, Loan, Member, Notification, NotificationType } from "./types";
import { canRenew, LOAN_PERIOD_DAYS, MAX_RENEWALS, RENEWAL_DAYS } from "./loanRules";
import { addDays } from "@/utils/dates";

export class LibraryError extends Error {}

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;

const nowIso = () => new Date().toISOString();

function activity(type: Activity["type"], memberId: string | null, bookId: string | null, metadata?: Record<string, string>): Activity {
  return { id: uid("a"), type, memberId, bookId, timestamp: nowIso(), ...(metadata ? { metadata } : {}) };
}

export function notify(memberId: string | null, type: NotificationType, title: string, message: string, extra: Partial<Notification> = {}): Notification {
  return { id: uid("n"), memberId, type, title, message, createdAt: nowIso(), readAt: null, ...extra };
}

function updateBook(data: LibraryData, bookId: string, fn: (b: Book) => Book): Book[] {
  return data.books.map((b) => (b.id === bookId ? fn(b) : b));
}

function requireBook(data: LibraryData, bookId: string): Book {
  const book = data.books.find((b) => b.id === bookId);
  if (!book) throw new LibraryError("Book not found");
  return book;
}

function requireLoan(data: LibraryData, loanId: string): Loan {
  const loan = data.loans.find((l) => l.id === loanId);
  if (!loan) throw new LibraryError("Loan not found");
  return loan;
}

export function defaultDueDate(from = new Date()): string {
  const d = addDays(from, LOAN_PERIOD_DAYS);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

export function issueLoan(data: LibraryData, input: { memberId: string; bookId: string; dueDate?: string }): { data: LibraryData; loan: Loan } {
  const book = requireBook(data, input.bookId);
  const member = data.members.find((m) => m.id === input.memberId);
  if (!member) throw new LibraryError("Member not found");
  if (member.membershipStatus !== "active") throw new LibraryError(`${member.name}'s membership is inactive`);
  if (book.archived || book.unavailable) throw new LibraryError(`${book.title} is not in circulation`);
  if (book.availableCopies <= 0) throw new LibraryError(`No copies of ${book.title} are available`);
  if (data.loans.some((l) => l.memberId === member.id && l.bookId === book.id && !l.returnedAt)) {
    throw new LibraryError(`${member.name} already has this book`);
  }
  const usedCopies = new Set(data.loans.filter((l) => l.bookId === book.id && !l.returnedAt).map((l) => l.copyNumber));
  let copyNumber = 1;
  while (usedCopies.has(copyNumber)) copyNumber++;

  const loan: Loan = {
    id: uid("L"),
    memberId: member.id,
    bookId: book.id,
    copyNumber,
    borrowedAt: nowIso(),
    dueDate: input.dueDate ?? defaultDueDate(),
    returnedAt: null,
    status: "active",
    renewalCount: 0,
  };
  // A borrowed reservation is fulfilled.
  const reservations = data.reservations.map((r) =>
    r.memberId === member.id && r.bookId === book.id && (r.status === "waiting" || r.status === "ready") ? { ...r, status: "fulfilled" as const } : r,
  );
  return {
    loan,
    data: {
      ...data,
      loans: [loan, ...data.loans],
      reservations,
      books: updateBook(data, book.id, (b) => ({ ...b, availableCopies: b.availableCopies - 1 })),
      activities: [activity("BORROW", member.id, book.id), ...data.activities],
    },
  };
}

export function returnLoan(data: LibraryData, loanId: string): { data: LibraryData; notifiedReservation: boolean } {
  const loan = requireLoan(data, loanId);
  if (loan.returnedAt) throw new LibraryError("This loan has already been returned");
  const book = requireBook(data, loan.bookId);
  const notifications: Notification[] = [
    notify(loan.memberId, "RETURN_CONFIRMATION", "Return confirmed", `Thanks for returning ${book.title}.`, { bookId: book.id }),
  ];
  // First person waiting in the reservation queue gets notified.
  const next = data.reservations
    .filter((r) => r.bookId === book.id && r.status === "waiting")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (next) notifications.push(notify(next.memberId, "RESERVATION", "Your reserved book is ready", `Your reserved book is now available: ${book.title}. Pick it up within 3 days.`, { bookId: book.id }));

  return {
    notifiedReservation: Boolean(next),
    data: {
      ...data,
      loans: data.loans.map((l) => (l.id === loanId ? { ...l, returnedAt: nowIso(), status: "returned" } : l)),
      reservations: data.reservations.map((r) => (next && r.id === next.id ? { ...r, status: "ready" } : r)),
      books: updateBook(data, book.id, (b) => ({ ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) })),
      notifications: [...notifications, ...data.notifications],
      activities: [activity("RETURN", loan.memberId, book.id), ...data.activities],
    },
  };
}

export function renewLoan(data: LibraryData, loanId: string): { data: LibraryData; loan: Loan } {
  const loan = requireLoan(data, loanId);
  const check = canRenew(loan);
  if (!check.ok) throw new LibraryError(check.reason ?? "Cannot renew");
  if (data.reservations.some((r) => r.bookId === loan.bookId && r.status === "waiting" && r.memberId !== loan.memberId)) {
    const book = requireBook(data, loan.bookId);
    if (book.availableCopies === 0) throw new LibraryError("Another member is waiting for this book");
  }
  // Renew from today if overdue, otherwise extend the current due date.
  const base = new Date(Math.max(Date.now(), new Date(loan.dueDate).getTime()));
  const due = addDays(base, RENEWAL_DAYS);
  due.setHours(18, 0, 0, 0);
  const updated: Loan = { ...loan, dueDate: due.toISOString(), renewalCount: loan.renewalCount + 1, status: "renewed" };
  return {
    loan: updated,
    data: {
      ...data,
      loans: data.loans.map((l) => (l.id === loanId ? updated : l)),
      activities: [activity("RENEW", loan.memberId, loan.bookId, { renewals: `${updated.renewalCount}/${MAX_RENEWALS}` }), ...data.activities],
    },
  };
}

export function extendDueDate(data: LibraryData, loanId: string, dueDate: string): LibraryData {
  const loan = requireLoan(data, loanId);
  if (loan.returnedAt) throw new LibraryError("Loan already returned");
  return { ...data, loans: data.loans.map((l) => (l.id === loanId ? { ...l, dueDate } : l)) };
}

export function sendReminder(data: LibraryData, loanId: string): LibraryData {
  const loan = requireLoan(data, loanId);
  const book = requireBook(data, loan.bookId);
  const overdueDays = Math.max(0, Math.round((Date.now() - new Date(loan.dueDate).getTime()) / 86_400_000));
  const message = overdueDays > 0
    ? `Reminder from the library: your copy of ${book.title} is ${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue. Please return or renew it.`
    : `Reminder from the library: your copy of ${book.title} is due soon.`;
  return {
    ...data,
    loans: data.loans.map((l) => (l.id === loanId ? { ...l, lastReminderAt: nowIso() } : l)),
    notifications: [notify(loan.memberId, overdueDays > 0 ? "OVERDUE" : "DUE_SOON", "Library reminder", message, { bookId: book.id }), ...data.notifications],
    activities: [activity("REMINDER_SENT", loan.memberId, book.id), ...data.activities],
  };
}

export type BookInput = Omit<Book, "id" | "addedAt" | "availableCopies"> & { availableCopies?: number };

export function addBook(data: LibraryData, input: BookInput): { data: LibraryData; book: Book } {
  const book: Book = { ...input, id: uid("b"), addedAt: nowIso(), availableCopies: input.availableCopies ?? input.totalCopies };
  // Tell members who declared interest in this category.
  const interested = data.members.filter((m) => m.membershipStatus === "active" && m.interests.includes(book.category));
  const notes = interested.map((m) => notify(m.id, "NEW_BOOK", "New arrival", `A new book matching your interests has been added: ${book.title}.`, { bookId: book.id }));
  return {
    book,
    data: {
      ...data,
      books: [book, ...data.books],
      notifications: [...notes, ...data.notifications],
      activities: [activity("BOOK_ADDED", null, book.id), ...data.activities],
    },
  };
}

export function editBook(data: LibraryData, bookId: string, patch: Partial<Omit<Book, "id">>): LibraryData {
  const book = requireBook(data, bookId);
  const onLoan = book.totalCopies - book.availableCopies;
  const totalCopies = patch.totalCopies ?? book.totalCopies;
  if (totalCopies < onLoan) throw new LibraryError(`${onLoan} copies are on loan — total can't be lower than that`);
  return { ...data, books: updateBook(data, bookId, (b) => ({ ...b, ...patch, totalCopies, availableCopies: totalCopies - onLoan })) };
}

export function addCopies(data: LibraryData, bookId: string, count = 1): LibraryData {
  const book = requireBook(data, bookId);
  let next = editBook(data, bookId, { totalCopies: book.totalCopies + count });
  // New copies can satisfy the reservation queue.
  const waiting = next.reservations.filter((r) => r.bookId === bookId && r.status === "waiting").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, count);
  if (waiting.length) {
    const ids = new Set(waiting.map((w) => w.id));
    next = {
      ...next,
      reservations: next.reservations.map((r) => (ids.has(r.id) ? { ...r, status: "ready" } : r)),
      notifications: [...waiting.map((w) => notify(w.memberId, "RESERVATION", "Your reserved book is ready", `Your reserved book is now available: ${book.title}.`, { bookId })), ...next.notifications],
    };
  }
  return next;
}

export function archiveBook(data: LibraryData, bookId: string, archived = true): LibraryData {
  const book = requireBook(data, bookId);
  if (archived && book.availableCopies < book.totalCopies) throw new LibraryError("Return all copies before archiving");
  return { ...data, books: updateBook(data, bookId, (b) => ({ ...b, archived })) };
}

export function toggleFavorite(data: LibraryData, memberId: string, bookId: string): { data: LibraryData; saved: boolean } {
  const existing = data.favorites.find((f) => f.memberId === memberId && f.bookId === bookId);
  if (existing) return { saved: false, data: { ...data, favorites: data.favorites.filter((f) => f.id !== existing.id) } };
  return { saved: true, data: { ...data, favorites: [{ id: uid("f"), memberId, bookId, createdAt: nowIso() }, ...data.favorites] } };
}

export function reserveBook(data: LibraryData, memberId: string, bookId: string): LibraryData {
  const book = requireBook(data, bookId);
  if (data.reservations.some((r) => r.memberId === memberId && r.bookId === bookId && (r.status === "waiting" || r.status === "ready"))) {
    throw new LibraryError("You already have a reservation for this book");
  }
  if (data.loans.some((l) => l.memberId === memberId && l.bookId === bookId && !l.returnedAt)) throw new LibraryError("You already have this book on loan");
  const queue = data.reservations.filter((r) => r.bookId === bookId && r.status === "waiting").length;
  return {
    ...data,
    reservations: [{ id: uid("r"), memberId, bookId, createdAt: nowIso(), status: "waiting" }, ...data.reservations],
    notifications: [notify(memberId, "RESERVATION", "Reservation placed", `You're #${queue + 1} in the queue for ${book.title}. We'll let you know when it's ready.`, { bookId }), ...data.notifications],
    activities: [activity("RESERVE", memberId, bookId), ...data.activities],
  };
}

export function cancelReservation(data: LibraryData, reservationId: string): LibraryData {
  return { ...data, reservations: data.reservations.map((r) => (r.id === reservationId ? { ...r, status: "cancelled" } : r)) };
}

export function markRead(data: LibraryData, ids: string[]): LibraryData {
  const set = new Set(ids);
  const at = nowIso();
  return { ...data, notifications: data.notifications.map((n) => (set.has(n.id) && !n.readAt ? { ...n, readAt: at } : n)) };
}

export function addMember(data: LibraryData, input: Omit<Member, "id" | "joinedAt">): { data: LibraryData; member: Member } {
  if (data.members.some((m) => m.email.toLowerCase() === input.email.toLowerCase())) throw new LibraryError("A member with this email already exists");
  const n = data.members.reduce((max, m) => Math.max(max, Number(m.id.replace(/\D/g, "")) || 0), 0) + 1;
  const member: Member = { ...input, id: `m${n}`, joinedAt: nowIso() };
  return {
    member,
    data: {
      ...data,
      members: [...data.members, member],
      notifications: [notify(member.id, "SYSTEM", "Welcome to PageNest", "Borrow a few books to unlock personalized recommendations."), ...data.notifications],
      activities: [activity("MEMBER_JOINED", member.id, null), ...data.activities],
    },
  };
}

export function updateMember(data: LibraryData, memberId: string, patch: Partial<Omit<Member, "id">>): LibraryData {
  return { ...data, members: data.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) };
}
