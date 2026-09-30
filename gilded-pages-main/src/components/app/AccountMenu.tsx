// Account menu: "Sign in" for visitors; profile, switch account and sign out
// for signed-in users. Identity comes from the session set by the login page.
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LayoutDashboard, LogIn, LogOut, Repeat, User } from "lucide-react";
import { toast } from "sonner";
import { useLibrary } from "@/services/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-soft text-[11px] font-semibold text-ink", className)}>{initials}</span>;
}

export function AccountMenu() {
  const { data, session, setSession, isLibrarian, librarian, hydrated } = useLibrary();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!session) {
    // Keep layout stable until we know whether someone is signed in.
    if (!hydrated) return <span className="block h-10 w-24" aria-hidden="true" />;
    return (
      <Button asChild variant="outline" className="h-10 rounded-full border-gold/50 px-4">
        <Link to="/login" search={path === "/" ? {} : { redirect: path }}><LogIn aria-hidden="true" /> Sign in</Link>
      </Button>
    );
  }

  const member = data.members.find((m) => m.id === session.memberId);
  const name = isLibrarian ? librarian.name : member?.name ?? "Member";
  const email = isLibrarian ? librarian.email : member?.email ?? "";

  const signOut = (switching: boolean) => {
    setSession(null);
    if (switching) navigate({ to: "/login" });
    else {
      toast.success("You've been signed out");
      navigate({ to: "/" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-ink/40 py-1 pr-3 pl-1 text-left transition-colors hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`Account menu for ${name}`}>
        <Avatar name={name} />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[130px] truncate text-xs text-ivory">{name}</span>
          <span className="block text-[10px] text-muted-foreground">{isLibrarian ? librarian.title : "Member"}</span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm text-ivory">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLibrarian ? (
          <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard" })}><LayoutDashboard /> Dashboard</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}><User /> My profile</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => signOut(true)}><Repeat /> Switch account</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut(false)} className="text-danger focus:text-danger"><LogOut /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
