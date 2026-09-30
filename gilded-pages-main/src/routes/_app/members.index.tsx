import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, UserPlus, Users } from "lucide-react";
import { useLibrary, useLibraryActions } from "@/services/store";
import { memberSummaries, categories } from "@/services/selectors";
import { EmptyState, PageHeader } from "@/components/common/Layout";
import { Avatar } from "@/components/app/AccountMenu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { timeAgo } from "@/utils/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/members/")({
  head: () => ({ meta: [{ title: "Members | PageNest" }] }),
  component: MembersPage,
});

const FILTERS = { all: "All", active: "Active", inactive: "Inactive", overdue: "Has overdue books", none: "No current loans" } as const;
type Filter = keyof typeof FILTERS;

function MembersPage() {
  const { data } = useLibrary();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const summaries = useMemo(() => memberSummaries(data), [data]);

  const rows = summaries
    .filter(({ member, current, overdue }) => {
      const term = q.trim().toLowerCase();
      if (term && !`${member.name} ${member.email} ${member.id}`.toLowerCase().includes(term)) return false;
      if (filter === "active") return member.membershipStatus === "active";
      if (filter === "inactive") return member.membershipStatus === "inactive";
      if (filter === "overdue") return overdue > 0;
      if (filter === "none") return current === 0;
      return true;
    })
    .sort((a, b) => b.overdue - a.overdue || a.member.name.localeCompare(b.member.name));

  const count = (f: Filter) => summaries.filter(({ member, current, overdue }) => f === "all" || (f === "active" && member.membershipStatus === "active") || (f === "inactive" && member.membershipStatus === "inactive") || (f === "overdue" && overdue > 0) || (f === "none" && current === 0)).length;

  return (
    <>
      <PageHeader eyebrow="People" title="Members" description="Everyone with a library card, their loans and their activity." actions={<Button onClick={() => setAdding(true)}><UserPlus aria-hidden="true" /> Register member</Button>} />
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or member ID…" className="h-11 rounded-full pl-10" aria-label="Search members" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter members">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", filter === f ? "border-gold bg-gold/10 text-gold-soft" : "border-border text-muted-foreground hover:text-ivory")}>
              {FILTERS[f]} <span className="opacity-60">{count(f)}</span>
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? <EmptyState icon={Users} title="No members match" /> : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface/80 text-left text-[10px] tracking-[.16em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Member</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Borrowed now</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Overdue</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Total</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ member, current, overdue, total, lastActivity }) => (
                  <tr key={member.id} className="bg-card/30 transition-colors hover:bg-card/70">
                    <td className="px-4 py-3">
                      <Link to="/members/$memberId" params={{ memberId: member.id }} className="flex items-center gap-3">
                        <Avatar name={member.name} />
                        <span className="min-w-0"><span className="block text-ivory hover:text-gold-soft">{member.name}</span><span className="block text-xs text-muted-foreground">{member.id.toUpperCase()} · {member.email}</span></span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusDot active={member.membershipStatus === "active"} /></td>
                    <td className="px-4 py-3 text-center text-ivory">{current}</td>
                    <td className="px-4 py-3 text-center">{overdue > 0 ? <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">{overdue} overdue</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{total}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lastActivity ? timeAgo(lastActivity) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {rows.map(({ member, current, overdue, total }) => (
              <li key={member.id}>
                <Link to="/members/$memberId" params={{ memberId: member.id }} className="app-card flex items-center gap-3 p-4">
                  <Avatar name={member.name} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="text-ivory">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{current} borrowed · {total} total</p>
                  </div>
                  {overdue > 0 ? <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">{overdue} overdue</span> : <StatusDot active={member.membershipStatus === "active"} />}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <AddMemberDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={cn("inline-flex items-center gap-1.5 text-xs", active ? "text-success" : "text-muted-foreground")}><span className={cn("size-1.5 rounded-full", active ? "bg-success" : "bg-muted-foreground")} aria-hidden="true" />{active ? "Active" : "Inactive"}</span>;
}

function AddMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data } = useLibrary();
  const actions = useLibraryActions();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [interests, setInterests] = useState<string[]>([]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actions.addMember({ ...form, membershipStatus: "active", interests })) {
      setForm({ name: "", email: "", phone: "" });
      setInterests([]);
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium">Register a member</DialogTitle>
            <DialogDescription>New members start with popular picks until they build a borrowing history.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid gap-4">
            {(["name", "email", "phone"] as const).map((k) => (
              <div key={k} className="grid gap-1.5">
                <Label htmlFor={`nm-${k}`} className="capitalize">{k === "name" ? "Full name" : k}</Label>
                <Input id={`nm-${k}`} type={k === "email" ? "email" : k === "phone" ? "tel" : "text"} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} required={k !== "phone"} />
              </div>
            ))}
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Reading interests (optional)</legend>
              <div className="flex flex-wrap gap-1.5">
                {categories(data).map((c) => {
                  const on = interests.includes(c);
                  return <button key={c} type="button" aria-pressed={on} onClick={() => setInterests((i) => (on ? i.filter((x) => x !== c) : [...i, c]))} className={cn("rounded-full border px-2.5 py-0.5 text-xs", on ? "border-gold bg-gold/10 text-gold-soft" : "border-border text-muted-foreground")}>{c}</button>;
                })}
              </div>
            </fieldset>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Register</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
