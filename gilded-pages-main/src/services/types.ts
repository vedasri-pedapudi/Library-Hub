// Core domain model. Mirrors the shape a future REST/DB backend would return,
// so the in-memory store can later be swapped for API calls without touching UI.

export type Role = "librarian" | "member";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description: string;
  category: string;
  keywords: string[];
  publicationYear: number;
  publisher: string;
  language: string;
  coverImage: string;
  totalCopies: number;
  availableCopies: number;
  addedAt: string;
  archived?: boolean;
  /** Manual override set by a librarian, e.g. damaged or withdrawn from circulation. */
  unavailable?: boolean;
}

export type MembershipStatus = "active" | "inactive";

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipStatus: MembershipStatus;
  joinedAt: string;
  interests: string[];
}

/** Stored status. Display status (DUE SOON / OVERDUE) is derived from dates, see loanRules. */
export type StoredLoanStatus = "active" | "renewed" | "returned";
export type LoanStatus = "ACTIVE" | "DUE_SOON" | "OVERDUE" | "RETURNED" | "RENEWED";

export interface Loan {
  id: string;
  memberId: string;
  bookId: string;
  copyNumber: number;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: StoredLoanStatus;
  renewalCount: number;
  lastReminderAt?: string;
}

export type ReservationStatus = "waiting" | "ready" | "fulfilled" | "cancelled";

export interface Reservation {
  id: string;
  memberId: string;
  bookId: string;
  createdAt: string;
  status: ReservationStatus;
}

export type NotificationType =
  | "DUE_SOON"
  | "OVERDUE"
  | "RETURN_CONFIRMATION"
  | "RECOMMENDATION"
  | "NEW_BOOK"
  | "RESERVATION"
  | "SYSTEM";

export interface Notification {
  id: string;
  /** null = addressed to library staff. */
  memberId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  bookId?: string;
  /** Idempotency key so the daily automation never duplicates an alert. */
  dedupeKey?: string;
}

export interface Favorite {
  id: string;
  memberId: string;
  bookId: string;
  createdAt: string;
}

export type RecommendationSource =
  | "author"
  | "category"
  | "similar"
  | "popular"
  | "new"
  | "interest";

export interface Recommendation {
  id: string;
  memberId: string;
  bookId: string;
  reason: string;
  source: RecommendationSource;
  score: number;
  createdAt: string;
}

export type ActivityType =
  | "BORROW"
  | "RETURN"
  | "RENEW"
  | "RESERVE"
  | "MEMBER_JOINED"
  | "BOOK_ADDED"
  | "REMINDER_SENT";

export interface Activity {
  id: string;
  type: ActivityType;
  memberId: string | null;
  bookId: string | null;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface LibraryData {
  books: Book[];
  members: Member[];
  loans: Loan[];
  reservations: Reservation[];
  notifications: Notification[];
  favorites: Favorite[];
  activities: Activity[];
  /** ISO date of the last time the daily automation ran. */
  lastAutomationRun: string | null;
}
