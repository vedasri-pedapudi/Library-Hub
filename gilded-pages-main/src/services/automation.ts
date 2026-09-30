// The "every day" job. Runs on app load (at most once per calendar day) and on
// demand from Settings. In production this would be a scheduled server task.
//
// 1–4. Loan statuses (DUE SOON / OVERDUE) are derived from dates in loanRules,
//      so they are always current without a write.
// 5–6. Generate due-soon and overdue notifications — idempotent via dedupeKey.
// 7.   Refresh recommendation notifications when a member's history changed.
import type { LibraryData, Notification } from "./types";
import { daysOverdue, daysUntilDue, getLoanStatus, isOpen } from "./loanRules";
import { notify } from "./libraryService";
import { activeRecommender } from "@/features/recommendations/engine";
import { daysBetween, toInputDate } from "@/utils/dates";

export interface AutomationReport {
  dueSoon: number;
  overdue: number;
  recommendations: number;
  ranAt: string;
}

export function runDailyAutomation(data: LibraryData, now = new Date()): { data: LibraryData; report: AutomationReport } {
  const existing = new Set(data.notifications.map((n) => n.dedupeKey).filter(Boolean));
  const books = new Map(data.books.map((b) => [b.id, b]));
  const created: Notification[] = [];
  let dueSoon = 0;
  let overdue = 0;
  let recommendations = 0;

  const push = (n: Notification) => {
    if (n.dedupeKey && existing.has(n.dedupeKey)) return false;
    if (n.dedupeKey) existing.add(n.dedupeKey);
    created.push(n);
    return true;
  };

  for (const loan of data.loans.filter(isOpen)) {
    const book = books.get(loan.bookId);
    if (!book) continue;
    const status = getLoanStatus(loan, now);
    if (status === "DUE_SOON") {
      const left = daysUntilDue(loan, now);
      const when = left === 0 ? "today" : `in ${left} day${left === 1 ? "" : "s"}`;
      if (push(notify(loan.memberId, "DUE_SOON", "Due soon", `Your copy of ${book.title} is due ${when}.`, { bookId: book.id, dedupeKey: `due-soon:${loan.id}:${loan.dueDate}` }))) dueSoon++;
    } else if (status === "OVERDUE") {
      const days = daysOverdue(loan, now);
      // One alert when it becomes overdue, then a weekly nudge.
      const week = Math.floor((days - 1) / 7);
      if (push(notify(loan.memberId, "OVERDUE", "Overdue book", `Your copy of ${book.title} is ${days} day${days === 1 ? "" : "s"} overdue.`, { bookId: book.id, dedupeKey: `overdue:${loan.id}:${loan.dueDate}:w${week}` }))) overdue++;
    }
  }

  // Recommendation refresh: members who borrowed something in the past week get fresh picks.
  const recentBorrowers = new Set(data.loans.filter((l) => daysBetween(l.borrowedAt, now) <= 7).map((l) => l.memberId));
  for (const memberId of recentBorrowers) {
    const recs = activeRecommender.recommend({ data, memberId, limit: 5, now });
    if (recs.length < 3) continue;
    const key = `recs:${memberId}:${toInputDate(now.toISOString()).slice(0, 7)}`;
    if (push(notify(memberId, "RECOMMENDATION", "New picks for you", `Based on your reading history, we found ${recs.length} books you may enjoy.`, { dedupeKey: key }))) recommendations++;
  }

  // Staff digest.
  const totalOverdue = data.loans.filter((l) => isOpen(l) && getLoanStatus(l, now) === "OVERDUE").length;
  if (totalOverdue > 0) {
    push(notify(null, "OVERDUE", "Daily overdue report", `${totalOverdue} loan${totalOverdue === 1 ? " is" : "s are"} overdue across the library.`, { dedupeKey: `staff-overdue:${toInputDate(now.toISOString())}` }));
  }

  return {
    report: { dueSoon, overdue, recommendations, ranAt: now.toISOString() },
    data: { ...data, notifications: [...created, ...data.notifications], lastAutomationRun: now.toISOString() },
  };
}

export function shouldRunToday(data: LibraryData, now = new Date()): boolean {
  return !data.lastAutomationRun || toInputDate(data.lastAutomationRun) !== toInputDate(now.toISOString());
}
