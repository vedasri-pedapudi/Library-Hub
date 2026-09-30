import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-[10px] font-semibold tracking-[.3em] text-gold uppercase">{eyebrow}</p>}
        <h1 className="font-display text-4xl leading-none font-medium text-ivory md:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, description, action, id }: { title: ReactNode; description?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="font-display text-2xl leading-tight font-medium text-ivory">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-gold/10 text-gold">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="font-display text-xl text-ivory">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Counts up from 0 on mount. */
export function AnimatedNumber({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(origin + (value - origin) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

export function StatCard({ label, value, icon: Icon, hint, tone = "default", className }: { label: string; value: number; icon: LucideIcon; hint?: ReactNode; tone?: "default" | "danger" | "warning" | "success"; className?: string }) {
  const toneCls = { default: "text-gold bg-gold/10", danger: "text-danger bg-danger/10", warning: "text-warning bg-warning/10", success: "text-success bg-success/10" }[tone];
  return (
    <div className={cn("app-card fade-up p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[.22em] text-muted-foreground uppercase">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-full", toneCls)}><Icon className="size-4" aria-hidden="true" /></span>
      </div>
      <p className="mt-3 font-display text-4xl leading-none text-ivory"><AnimatedNumber value={value} /></p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
