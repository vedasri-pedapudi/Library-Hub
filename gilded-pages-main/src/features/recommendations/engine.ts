// Rule-based hybrid recommender. It is intentionally NOT presented as AI:
// every score comes from explicit signals (history, categories, authors,
// keyword similarity, popularity, recency) and carries a human-readable reason.
//
// To swap in an ML / embedding model later, implement `Recommender` and
// change `activeRecommender` — the UI only depends on the interface.
import type { Book, LibraryData, Recommendation, RecommendationSource } from "@/services/types";
import { activeBooks, borrowCounts, indexById } from "@/services/selectors";
import { daysBetween } from "@/utils/dates";

export interface RecommendContext {
  data: LibraryData;
  memberId: string;
  limit?: number;
  now?: Date;
}

export interface Recommender {
  readonly name: string;
  recommend(ctx: RecommendContext): Recommendation[];
  similar(data: LibraryData, bookId: string, limit?: number): { book: Book; reason: string }[];
}

const NEW_ARRIVAL_DAYS = 30;

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const inter = a.filter((x) => setB.has(x)).length;
  return inter / (a.length + b.length - inter);
}

interface Signal {
  source: RecommendationSource;
  score: number;
  reason: string;
}

export const ruleBasedRecommender: Recommender = {
  name: "Rule-based hybrid (history · category · author · similarity · popularity)",

  recommend({ data, memberId, limit = 24, now = new Date() }) {
    const member = data.members.find((m) => m.id === memberId);
    if (!member) return [];
    const books = indexById(data.books);
    const history = data.loans
      .filter((l) => l.memberId === memberId)
      .sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt))
      .map((l) => books.get(l.bookId))
      .filter((b): b is Book => Boolean(b));
    const seen = new Set(history.map((b) => b.id));

    const catCounts = new Map<string, number>();
    const authorCounts = new Map<string, number>();
    for (const b of history) {
      catCounts.set(b.category, (catCounts.get(b.category) ?? 0) + 1);
      authorCounts.set(b.author, (authorCounts.get(b.author) ?? 0) + 1);
    }
    const popularity = borrowCounts(data, 90, now);
    const maxPop = Math.max(1, ...popularity.values());
    const recent = history.slice(0, 5);
    const coldStart = history.length < 2;

    const results: Recommendation[] = [];
    for (const book of activeBooks(data)) {
      if (seen.has(book.id)) continue;
      const signals: Signal[] = [];

      const authorN = authorCounts.get(book.author) ?? 0;
      if (authorN > 0) signals.push({ source: "author", score: 2.5 + authorN * 1.5, reason: `Because you enjoyed books by ${book.author}.` });

      const catN = catCounts.get(book.category) ?? 0;
      if (catN >= 2) signals.push({ source: "category", score: 1 + catN * 0.9, reason: `Because you frequently borrow ${book.category}.` });
      else if (catN === 1) signals.push({ source: "category", score: 1.2, reason: `You've explored ${book.category} before.` });

      if (member.interests.includes(book.category)) signals.push({ source: "interest", score: 1.6, reason: `Matches your interest in ${book.category}.` });

      let bestSim = 0;
      let simTo: Book | null = null;
      for (const r of recent) {
        const s = jaccard(book.keywords, r.keywords) + (r.category === book.category ? 0.15 : 0);
        if (s > bestSim) { bestSim = s; simTo = r; }
      }
      if (simTo && bestSim >= 0.25) signals.push({ source: "similar", score: bestSim * 6, reason: `Similar to ${simTo.title}, which you borrowed recently.` });

      const pop = (popularity.get(book.id) ?? 0) / maxPop;
      if (pop > 0.3) {
        const matchesTaste = catN > 0 || member.interests.includes(book.category);
        signals.push({ source: "popular", score: pop * (coldStart ? 3 : 1.4), reason: matchesTaste ? `Popular among readers with similar interests.` : `One of the most borrowed books this season.` });
      }

      const isNew = daysBetween(book.addedAt, now) <= NEW_ARRIVAL_DAYS;
      if (isNew && (catN > 0 || member.interests.includes(book.category) || coldStart)) {
        signals.push({ source: "new", score: coldStart ? 2 : 1.5, reason: `New arrival in ${book.category}.` });
      }

      if (!signals.length) continue;
      signals.sort((a, b) => b.score - a.score);
      const top = signals[0] as Signal;
      // Combined score: strongest signal plus diminishing credit for the rest.
      const score = signals.reduce((s, sig, i) => s + sig.score / (i + 1), 0) + (book.availableCopies > 0 ? 0.3 : 0);
      results.push({
        id: `rec-${memberId}-${book.id}`,
        memberId,
        bookId: book.id,
        reason: top.reason,
        source: top.source,
        score: Math.round(score * 100) / 100,
        createdAt: now.toISOString(),
      });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  },

  similar(data, bookId, limit = 6) {
    const target = data.books.find((b) => b.id === bookId);
    if (!target) return [];
    // Co-borrowing: other books borrowed by members who borrowed this one.
    const readers = new Set(data.loans.filter((l) => l.bookId === bookId).map((l) => l.memberId));
    const coBorrow = new Map<string, number>();
    for (const l of data.loans) if (readers.has(l.memberId) && l.bookId !== bookId) coBorrow.set(l.bookId, (coBorrow.get(l.bookId) ?? 0) + 1);
    const maxCo = Math.max(1, ...coBorrow.values());

    return activeBooks(data)
      .filter((b) => b.id !== bookId)
      .map((b) => {
        const parts: [number, string][] = [
          [b.author === target.author ? 3 : 0, `Also by ${b.author}.`],
          [jaccard(b.keywords, target.keywords) * 5, `Shares themes with ${target.title}.`],
          [b.category === target.category ? 1.2 : 0, `More ${b.category}.`],
          [((coBorrow.get(b.id) ?? 0) / maxCo) * 2.5, `Readers of ${target.title} also borrowed this.`],
        ];
        parts.sort((x, y) => y[0] - x[0]);
        return { book: b, score: parts.reduce((s, p) => s + p[0], 0), reason: parts[0]?.[1] ?? "" };
      })
      .filter((x) => x.score > 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ book, reason }) => ({ book, reason }));
  },
};

export const activeRecommender: Recommender = ruleBasedRecommender;

export interface RecommendationSections {
  becauseYouRead: { anchor: Book; items: { book: Book; reason: string }[] } | null;
  interests: Recommendation[];
  similar: Recommendation[];
  popularInGenres: Recommendation[];
  newArrivals: Recommendation[];
  all: Recommendation[];
  coldStart: boolean;
}

/** Groups recommendations into the sections of the "Recommended for You" page. */
export function recommendationSections(data: LibraryData, memberId: string): RecommendationSections {
  const all = activeRecommender.recommend({ data, memberId, limit: 40 });
  const books = indexById(data.books);
  const lastLoan = data.loans.filter((l) => l.memberId === memberId).sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt))[0];
  const anchor = lastLoan ? books.get(lastLoan.bookId) : undefined;
  const borrowed = new Set(data.loans.filter((l) => l.memberId === memberId).map((l) => l.bookId));
  const bySource = (...s: RecommendationSource[]) => all.filter((r) => s.includes(r.source));

  return {
    becauseYouRead: anchor
      ? { anchor, items: activeRecommender.similar(data, anchor.id, 8).filter((x) => !borrowed.has(x.book.id)) }
      : null,
    interests: bySource("category", "interest", "author").slice(0, 8),
    similar: bySource("similar").slice(0, 8),
    popularInGenres: bySource("popular").slice(0, 8),
    newArrivals: bySource("new").slice(0, 8),
    all,
    coldStart: borrowed.size < 2,
  };
}
