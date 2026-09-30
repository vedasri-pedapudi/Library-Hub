import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useLibrary } from "@/services/store";
import { AuthError, DEMO_PASSWORDS, signInWithPassword, type Session } from "@/services/auth";
import { Brand } from "@/components/app/AppShell";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import libraryHall from "@/assets/library-hall.jpg";

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  // Only same-site paths are accepted as redirect targets.
  validateSearch: (s: Record<string, unknown>): LoginSearch =>
    typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//") && s["redirect"] !== "/login" ? { redirect: s["redirect"] } : {},
  head: () => ({ meta: [{ title: "Sign in | PageNest" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function destination(session: Session, redirect?: string) {
  if (redirect) return redirect;
  return session.role === "librarian" ? "/dashboard" : "/";
}

function LoginPage() {
  const { data, session, hydrated, setSession, librarian } = useLibrary();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Already signed in → go straight to where they were heading.
  useEffect(() => {
    if (hydrated && session && !pending) navigate({ to: destination(session, redirect), replace: true });
  }, [hydrated, session, pending, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const s = await signInWithPassword(data, email, password);
      const name = s.role === "librarian" ? librarian.name : data.members.find((m) => m.id === s.memberId)?.name ?? "";
      setSession(s);
      toast.success(`Welcome back, ${name.split(" ")[0]}`);
      navigate({ to: destination(s, redirect), replace: true });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  };

  const demoAccounts = [
    { email: librarian.email, password: DEMO_PASSWORDS.librarian, name: librarian.name, role: "Librarian", note: "Dashboard, loans & overdue", Icon: ShieldCheck },
    { email: data.members.find((m) => m.id === "m1")?.email ?? "", password: DEMO_PASSWORDS.member, name: "Sarah Chen", role: "Member", note: "Has loans due & recommendations", Icon: UserRound },
    { email: data.members.find((m) => m.id === "m16")?.email ?? "", password: DEMO_PASSWORDS.member, name: "Chloe Anderson", role: "New member", note: "No history yet", Icon: Sparkles },
  ];

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Visual panel — always dark, like the hero */}
      <section className="library-hero relative hidden overflow-hidden lg:block" aria-hidden="true">
        <img src={libraryHall} alt="" className="absolute inset-0 h-full w-full object-cover object-[60%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Brand />
          <div className="max-w-md">
            <p className="text-[10px] font-semibold tracking-[.36em] text-gold-soft uppercase">Welcome back</p>
            <p className="mt-5 font-display text-5xl leading-[1.02] text-ivory">“A reader lives a thousand lives before he dies.”</p>
            <p className="mt-4 text-sm text-ivory/70">— George R.R. Martin</p>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-ivory">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to library
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm min-w-0 flex-1 flex-col justify-center py-10">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <h1 className="font-display text-4xl leading-none text-ivory">Sign in</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {redirect ? "Sign in to continue to that page." : "Manage your loans, see what's due and get picks chosen for you."}
          </p>

          <form onSubmit={submit} className="mt-8 grid gap-5" noValidate>
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger/35 bg-danger/10 px-3.5 py-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input ref={emailRef} id="login-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" required aria-invalid={Boolean(error)} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-11" required aria-invalid={Boolean(error)} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-ivory focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="h-11 w-full" disabled={pending || !hydrated}>
              {pending ? <><Loader2 className="animate-spin" aria-hidden="true" /> Signing in…</> : "Sign in"}
            </Button>
          </form>

          <div className="mt-10">
            <div className="mb-3 flex items-center gap-3 text-[10px] tracking-[.24em] text-muted-foreground uppercase">
              <span className="h-px flex-1 bg-border" /> Demo accounts <span className="h-px flex-1 bg-border" />
            </div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {demoAccounts.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => { setEmail(a.email); setPassword(a.password); setError(null); emailRef.current?.focus(); }}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left transition-colors hover:border-gold/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"><a.Icon className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ivory">{a.name} <span className="text-[10px] tracking-wider text-gold uppercase">· {a.role}</span></span>
                      <span className="block truncate text-xs text-muted-foreground">{a.email} · {a.note}</span>
                    </span>
                    <span className="text-[11px] text-gold">Use</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Every member signs in with password <code className="rounded bg-secondary px-1">{DEMO_PASSWORDS.member}</code>; the librarian uses <code className="rounded bg-secondary px-1">{DEMO_PASSWORDS.librarian}</code>. Demo only — credentials are checked in the browser.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
