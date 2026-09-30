import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Database, PlayCircle, RotateCcw, Scale } from "lucide-react";
import { toast } from "sonner";
import { useLibrary } from "@/services/store";
import { DUE_SOON_WINDOW_DAYS, LOAN_PERIOD_DAYS, MAX_RENEWALS, RENEWAL_DAYS } from "@/services/loanRules";
import { activeRecommender } from "@/features/recommendations/engine";
import { PageHeader, SectionHeader } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { timeAgo } from "@/utils/dates";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings | PageNest" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, runAutomation, resetDemo } = useLibrary();
  const rules: [string, string][] = [
    ["Standard loan period", `${LOAN_PERIOD_DAYS} days`],
    ["Renewal extends by", `${RENEWAL_DAYS} days`],
    ["Maximum renewals", String(MAX_RENEWALS)],
    ["“Due soon” window", `${DUE_SOON_WINDOW_DAYS} days before due date`],
    ["Overdue rule", "Today is after the due date and the book hasn't been returned"],
    ["Overdue reminders", "When a loan becomes overdue, then weekly"],
  ];
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" description="Loan rules, automation and demo data." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="app-card p-6" aria-labelledby="rules">
          <SectionHeader id="rules" title={<span className="inline-flex items-center gap-2"><Scale className="size-5 text-gold" aria-hidden="true" /> Loan rules</span>} description="Deterministic business rules — no AI involved." />
          <dl className="divide-y divide-border text-sm">
            {rules.map(([k, v]) => <div key={k} className="flex justify-between gap-6 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right text-ivory">{v}</dd></div>)}
          </dl>
        </section>

        <section className="app-card p-6" aria-labelledby="automation">
          <SectionHeader id="automation" title={<span className="inline-flex items-center gap-2"><PlayCircle className="size-5 text-gold" aria-hidden="true" /> Daily automation</span>} description={`Last run ${data.lastAutomationRun ? timeAgo(data.lastAutomationRun) : "never"}.`} />
          <ol className="mb-5 grid list-decimal gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>Find loans approaching their due date → mark <span className="text-warning">Due soon</span></li>
            <li>Find loans past their due date → mark <span className="text-danger">Overdue</span></li>
            <li>Send due-soon and overdue notifications (never duplicated)</li>
            <li>Refresh recommendations for members with new activity</li>
            <li>Send the staff overdue digest</li>
          </ol>
          <Button onClick={() => { const r = runAutomation(); toast.success("Daily check complete", { description: `${r.dueSoon} due-soon, ${r.overdue} overdue, ${r.recommendations} recommendation alerts created.` }); }}>
            <PlayCircle aria-hidden="true" /> Run now
          </Button>
        </section>

        <section className="app-card p-6" aria-labelledby="engine">
          <SectionHeader id="engine" title={<span className="inline-flex items-center gap-2"><Cpu className="size-5 text-gold" aria-hidden="true" /> Recommendation engine</span>} />
          <p className="text-sm text-ivory">{activeRecommender.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The engine sits behind a <code className="rounded bg-secondary px-1 text-xs">Recommender</code> interface in <code className="rounded bg-secondary px-1 text-xs">features/recommendations/engine.ts</code>.
            An embedding or ML model can replace it without changing any page.
          </p>
        </section>

        <section className="app-card p-6" aria-labelledby="demo">
          <SectionHeader id="demo" title={<span className="inline-flex items-center gap-2"><Database className="size-5 text-gold" aria-hidden="true" /> Demo data</span>} description="Data is stored in this browser. Connect an API in services/store.tsx to go live." />
          <p className="mb-5 text-sm text-muted-foreground">{data.books.length} books · {data.members.length} members · {data.loans.length} loans · {data.notifications.length} notifications</p>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline"><RotateCcw aria-hidden="true" /> Reset demo data</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
                <AlertDialogDescription>Every loan, book, member and notification change made in this browser will be replaced with the original seed data.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetDemo}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </>
  );
}
