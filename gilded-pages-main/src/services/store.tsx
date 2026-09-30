// Client-side data store. Persists to localStorage so the demo behaves like a
// real app across reloads. To connect a backend, replace `load`/`save` and the
// action bodies with API calls — components only use `useLibrary()`.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { LibraryData } from "./types";
import { buildSeedData, LIBRARIAN } from "./seed";
import type { Session } from "./auth";
import * as svc from "./libraryService";
import { runDailyAutomation, shouldRunToday, type AutomationReport } from "./automation";

const DATA_KEY = "pagenest:data:v1";
const SESSION_KEY = "pagenest:session:v2";

export type { Session };

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — app keeps working in memory */
  }
}

type Mutator = (data: LibraryData) => LibraryData;

interface LibraryContextValue {
  data: LibraryData;
  /** null when signed out. */
  session: Session | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  isLibrarian: boolean;
  /** The signed-in member's ID ("" for librarians and signed-out visitors). */
  currentMemberId: string;
  librarian: typeof LIBRARIAN;
  setSession: (s: Session | null) => void;
  /** Apply a mutation; shows the error as a toast and returns false on failure. */
  mutate: (fn: Mutator, success?: string) => boolean;
  runAutomation: () => AutomationReport;
  resetDemo: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LibraryData>(() => buildSeedData());
  const [session, setSessionState] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let loaded = readJson<LibraryData>(DATA_KEY) ?? dataRef.current;
    if (shouldRunToday(loaded)) loaded = runDailyAutomation(loaded).data;
    setData(loaded);
    const s = readJson<Session>(SESSION_KEY);
    const valid = s && ((s.role === "librarian" && s.memberId === LIBRARIAN.id) || (s.role === "member" && loaded.members.some((m) => m.id === s.memberId && m.membershipStatus === "active")));
    if (valid) setSessionState(s);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeJson(DATA_KEY, data);
  }, [data, hydrated]);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    if (s) writeJson(SESSION_KEY, s);
    else {
      try { window.localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    }
  }, []);

  const mutate = useCallback((fn: Mutator, success?: string) => {
    try {
      const next = fn(dataRef.current);
      dataRef.current = next;
      setData(next);
      if (success) toast.success(success);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return false;
    }
  }, []);

  const runAutomation = useCallback(() => {
    const { data: next, report } = runDailyAutomation(dataRef.current);
    dataRef.current = next;
    setData(next);
    return report;
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = runDailyAutomation(buildSeedData()).data;
    dataRef.current = fresh;
    setData(fresh);
    toast.success("Demo data restored");
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      data,
      session,
      hydrated,
      isAuthenticated: session !== null,
      isLibrarian: session?.role === "librarian",
      currentMemberId: session?.role === "member" ? session.memberId : "",
      librarian: LIBRARIAN,
      setSession,
      mutate,
      runAutomation,
      resetDemo,
    }),
    [data, session, hydrated, setSession, mutate, runAutomation, resetDemo],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}

/** Domain actions bound to the store, with friendly toasts. */
export function useLibraryActions() {
  const { mutate, currentMemberId, data, isAuthenticated } = useLibrary();
  const navigate = useNavigate();
  const path = useRouterState({ select: (st) => st.location.pathname });
  /** Member-only actions send signed-out visitors to the login page. */
  const requireMember = (verb: string, fn: () => boolean) => {
    if (!isAuthenticated) {
      toast(`Sign in to ${verb}`, { description: "Members can borrow, reserve and save books." });
      navigate({ to: "/login", search: { redirect: path } });
      return false;
    }
    if (!currentMemberId) {
      toast.error("Switch to a member account to do this.");
      return false;
    }
    return fn();
  };
  const title = (bookId: string) => data.books.find((b) => b.id === bookId)?.title ?? "Book";
  const memberName = (memberId: string) => data.members.find((m) => m.id === memberId)?.name ?? "Member";

  return {
    issue: (memberId: string, bookId: string, dueDate?: string) =>
      mutate((d) => svc.issueLoan(d, dueDate ? { memberId, bookId, dueDate } : { memberId, bookId }).data, `${title(bookId)} issued to ${memberName(memberId)}`),
    borrowSelf: (bookId: string) => requireMember("borrow books", () => mutate((d) => svc.issueLoan(d, { memberId: currentMemberId, bookId }).data, `You borrowed ${title(bookId)}. Enjoy!`)),
    returnLoan: (loanId: string) => {
      const loan = data.loans.find((l) => l.id === loanId);
      return mutate((d) => svc.returnLoan(d, loanId).data, loan ? `${title(loan.bookId)} marked as returned` : "Returned");
    },
    renew: (loanId: string) => mutate((d) => svc.renewLoan(d, loanId).data, "Loan renewed for 14 more days"),
    extend: (loanId: string, dueDate: string) => mutate((d) => svc.extendDueDate(d, loanId, dueDate), "Due date updated"),
    remind: (loanId: string) => mutate((d) => svc.sendReminder(d, loanId), "Reminder sent to member"),
    remindMany: (loanIds: string[]) => mutate((d) => loanIds.reduce(svc.sendReminder, d), `${loanIds.length} reminder${loanIds.length === 1 ? "" : "s"} sent`),
    toggleFavorite: (bookId: string) => requireMember("save books", () => {
      const saved = data.favorites.some((f) => f.memberId === currentMemberId && f.bookId === bookId);
      return mutate((d) => svc.toggleFavorite(d, currentMemberId, bookId).data, saved ? "Removed from saved books" : "Saved to your list");
    }),
    reserve: (bookId: string) => requireMember("reserve books", () => mutate((d) => svc.reserveBook(d, currentMemberId, bookId), `Reserved ${title(bookId)}`)),
    cancelReservation: (id: string) => mutate((d) => svc.cancelReservation(d, id), "Reservation cancelled"),
    markRead: (ids: string[]) => mutate((d) => svc.markRead(d, ids)),
    addBook: (input: svc.BookInput) => mutate((d) => svc.addBook(d, input).data, `${input.title} added to the catalog`),
    editBook: (bookId: string, patch: Parameters<typeof svc.editBook>[2]) => mutate((d) => svc.editBook(d, bookId, patch), "Book updated"),
    addCopies: (bookId: string, n = 1) => mutate((d) => svc.addCopies(d, bookId, n), `Added ${n} cop${n === 1 ? "y" : "ies"}`),
    archive: (bookId: string, archived = true) => mutate((d) => svc.archiveBook(d, bookId, archived), archived ? "Book archived" : "Book restored"),
    addMember: (input: Parameters<typeof svc.addMember>[1]) => mutate((d) => svc.addMember(d, input).data, `${input.name} registered`),
    updateMember: (memberId: string, patch: Parameters<typeof svc.updateMember>[2]) => mutate((d) => svc.updateMember(d, memberId, patch), "Member updated"),
    sendRecommendations: (memberId: string, count: number) =>
      mutate(
        (d) => ({ ...d, notifications: [svc.notify(memberId, "RECOMMENDATION", "Picks from your librarian", `Based on your reading history, we found ${count} books you may enjoy.`), ...d.notifications] }),
        `Recommendations sent to ${memberName(memberId)}`,
      ),
  };
}
