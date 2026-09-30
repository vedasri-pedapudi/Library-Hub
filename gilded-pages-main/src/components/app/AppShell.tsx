import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, Loader2, Lock, LogIn, Search } from "lucide-react";
import { isPublicPath } from "@/services/auth";
import { useLibrary } from "@/services/store";
import { overdueLoans } from "@/services/selectors";
import { NAV, LIBRARIAN_ONLY, type NavItem } from "./nav";
import { NotificationBell } from "./NotificationBell";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { useGlobalSearch } from "./GlobalSearch";
import { useVisibleNotifications } from "@/features/notifications/useNotifications";
import { EmptyState } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isActive(path: string, to: string) {
  return to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);
}

function useBadges() {
  const { data, isLibrarian, currentMemberId } = useLibrary();
  const { unread } = useVisibleNotifications();
  const overdue = overdueLoans(data);
  return {
    notifications: unread,
    overdue: overdue.length,
    loans: isLibrarian ? 0 : overdue.filter((l) => l.memberId === currentMemberId).length,
  } satisfies Record<NonNullable<NavItem["badge"]>, number>;
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("brand", className)} aria-label="PageNest home">
      <BookOpen className="brand-icon" aria-hidden="true" />
      <span><span className="brand-name">PageNest</span><span className="brand-sub">LIBRARY SYSTEM</span></span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, hydrated } = useLibrary();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const items = NAV[session?.role ?? "guest"];
  const badges = useBadges();
  const search = useGlobalSearch();
  const isPublic = isPublicPath(path);
  const restricted = session?.role === "member" && LIBRARIAN_ONLY.some((p) => isActive(path, p));
  const needsSignIn = !isPublic && !session;

  // Protected pages send signed-out visitors to the login page, then back.
  useEffect(() => {
    if (hydrated && needsSignIn) navigate({ to: "/login", search: { redirect: path }, replace: true });
  }, [hydrated, needsSignIn, path, navigate]);

  return (
    <div className="app-bg min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-ink/60 backdrop-blur-md lg:flex" aria-label="Sidebar">
        <div className="flex h-[76px] items-center px-6"><Brand /></div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <p className="px-3 pb-2 text-[10px] tracking-[.24em] text-muted-foreground uppercase">{session?.role === "librarian" ? "Library staff" : session ? "My library" : "Explore"}</p>
          <ul className="grid gap-0.5">
            {items.map((item) => {
              const active = isActive(path, item.to);
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active ? "bg-gold/12 text-gold-soft" : "text-ivory/80 hover:bg-accent/40 hover:text-ivory",
                    )}
                  >
                    <item.icon className={cn("size-4", active ? "text-gold" : "text-muted-foreground group-hover:text-ivory")} aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span className={cn("rounded-full px-1.5 text-[10px] leading-5 font-semibold", item.badge === "notifications" ? "bg-gold text-ink" : "bg-danger/20 text-danger")}>
                        {count}<span className="sr-only"> {item.badge === "notifications" ? "unread" : "overdue"}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {session ? (
          <div className="border-t border-border p-4 text-[11px] leading-relaxed text-muted-foreground">
            Demo mode · data is saved in this browser.
          </div>
        ) : (
          <div className="m-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <p className="font-display text-lg leading-tight text-ivory">Borrow, reserve and get picks made for you.</p>
            <Button asChild size="sm" className="mt-3 w-full"><Link to="/login" search={path === "/" ? {} : { redirect: path }}><LogIn aria-hidden="true" /> Sign in</Link></Button>
          </div>
        )}
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8 lg:h-[76px]">
          <div className="lg:hidden"><Brand className="[&_.brand-sub]:hidden [&_.brand-name]:text-[22px] [&_.brand-icon]:size-6" /></div>
          <button
            type="button"
            onClick={search.open}
            className="ml-auto flex h-10 w-10 items-center gap-2 rounded-full border border-border bg-ink/40 px-3 text-sm text-muted-foreground transition-colors hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:w-72 lg:ml-0 lg:w-96"
            aria-label="Search the library"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden flex-1 truncate text-left sm:block">Search books, authors, ISBNs…</span>
            <kbd className="hidden rounded border border-border px-1.5 text-[10px] sm:block">⌘K</kbd>
          </button>
          <div className="flex items-center gap-2 lg:ml-auto">
            <ThemeToggle />
            {session && <NotificationBell />}
            <AccountMenu />
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1400px] px-4 pt-6 pb-28 md:px-8 md:pt-10 lg:pb-16">
          {needsSignIn ? (
            <div className="grid place-items-center py-24 text-muted-foreground" role="status">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">Checking your sign-in…</span>
            </div>
          ) : restricted && hydrated ? (
            <EmptyState
              icon={Lock}
              title="Librarian access only"
              description="This area manages library records. Sign in with a librarian account to continue."
              action={<Button asChild variant="outline"><Link to="/">Back to home</Link></Button>}
              className="mt-10"
            />
          ) : (
            <div key={path} className="page-enter">{children}</div>
          )}
        </main>
      </div>

      <MobileNav items={items.filter((i) => i.mobile)} path={path} badges={badges} />
    </div>
  );
}

function MobileNav({ items, path, badges }: { items: NavItem[]; path: string; badges: ReturnType<typeof useBadges> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-ink/95 backdrop-blur lg:hidden" aria-label="Mobile navigation">
      <ul className="mx-auto flex max-w-lg justify-around px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const active = isActive(path, item.to);
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <li key={item.to} className="flex-1">
              <Link to={item.to} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px]", active ? "text-gold-soft" : "text-muted-foreground")}>
                <item.icon className="size-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label.replace("Recommendations", "For You")}</span>
                {count > 0 && <span className="absolute top-0 right-[calc(50%-18px)] size-2 rounded-full bg-danger" aria-label={`${count} alerts`} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
