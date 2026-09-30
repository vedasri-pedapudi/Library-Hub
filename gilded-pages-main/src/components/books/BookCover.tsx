import { useState } from "react";
import type { Book } from "@/services/types";
import { cn } from "@/lib/utils";

// Warm, muted palettes for the typographic fallback cover.
const PALETTES = [
  ["oklch(0.34 0.06 30)", "oklch(0.86 0.07 80)"],
  ["oklch(0.30 0.05 250)", "oklch(0.88 0.06 85)"],
  ["oklch(0.32 0.06 150)", "oklch(0.90 0.05 90)"],
  ["oklch(0.28 0.03 60)", "oklch(0.84 0.10 78)"],
  ["oklch(0.36 0.08 350)", "oklch(0.90 0.04 80)"],
  ["oklch(0.26 0.04 200)", "oklch(0.85 0.08 75)"],
] as const;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  book: Pick<Book, "title" | "author" | "coverImage">;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BookCover({ book, className, size = "md" }: Props) {
  const [failed, setFailed] = useState(!book.coverImage);
  const [bg, fg] = PALETTES[hash(book.title) % PALETTES.length] ?? PALETTES[0];

  return (
    <div className={cn("cover-shadow relative aspect-[2/3] overflow-hidden rounded-[6px] bg-surface", className)}>
      {!failed ? (
        <img
          src={book.coverImage}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-[9%]" style={{ background: `linear-gradient(160deg, ${bg}, oklch(0.16 0.02 55))`, color: fg }} role="img" aria-label={`Cover of ${book.title}`}>
          <div className="h-px w-1/3 bg-current opacity-50" />
          <div className={cn("font-display leading-[1.02] font-semibold", size === "sm" ? "text-[13px]" : size === "lg" ? "text-3xl" : "text-lg")}>{book.title}</div>
          <div className={cn("uppercase tracking-[.18em] opacity-80", size === "lg" ? "text-xs" : "text-[8px]")}>{book.author}</div>
        </div>
      )}
      {/* Spine highlight for a physical feel */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/35 via-white/10 to-transparent" />
    </div>
  );
}
