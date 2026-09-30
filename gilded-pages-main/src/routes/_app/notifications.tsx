import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BellOff, BookOpen, CheckCheck, Clock, Megaphone, RotateCcw, Sparkles, BookmarkCheck, Info, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import type { NotificationType } from "@/services/types";
import { useLibrary, useLibraryActions } from "@/services/store";
import { useVisibleNotifications } from "@/features/notifications/useNotifications";
import { EmptyState, PageHeader } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/utils/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications | PageNest" }] }),
  component: NotificationsPage,
});

const TYPE_META: Record<NotificationType, { label: string; Icon: typeof Clock; cls: string }> = {
  DUE_SOON: { label: "Due soon", Icon: Clock, cls: "text-warning bg-warning/10" },
  OVERDUE: { label: "Overdue", Icon: AlertTriangle, cls: "text-danger bg-danger/10" },
  RETURN_CONFIRMATION: { label: "Returned", Icon: RotateCcw, cls: "text-success bg-success/10" },
  RECOMMENDATION: { label: "Recommendation", Icon: Sparkles, cls: "text-gold bg-gold/10" },
  NEW_BOOK: { label: "New book", Icon: BookOpen, cls: "text-gold-soft bg-gold/10" },
  RESERVATION: { label: "Reservation", Icon: BookmarkCheck, cls: "text-info bg-info/10" },
  SYSTEM: { label: "System", Icon: Info, cls: "text-muted-foreground bg-muted" },
};

function NotificationsPage() {
  const { data, isLibrarian, runAutomation } = useLibrary();
  const actions = useLibraryActions();
  const { items, unread } = useVisibleNotifications();
  const [filter, setFilter] = useState<NotificationType | "ALL" | "UNREAD">("ALL");
  const members = new Map(data.members.map((m) => [m.id, m]));

  const markable = (n: (typeof items)[number]) => !n.readAt && (isLibrarian ? n.memberId === null : true);
  const visible = items.filter((n) => (filter === "ALL" ? true : filter === "UNREAD" ? markable(n) : n.type === filter));
  const types = [...new Set(items.map((n) => n.type))];

  return (
    <>
      <PageHeader
        eyebrow={isLibrarian ? "Library alerts" : "Stay in the loop"}
        title={isLibrarian ? "Alerts" : "Notifications"}
        description={isLibrarian ? "Staff alerts plus every alert the system has sent to members. Due-soon and overdue checks run automatically each day." : "Due dates, reservations and picks chosen for you."}
        actions={
          <>
            {isLibrarian && (
              <Button variant="outline" onClick={() => {
                const r = runAutomation();
                toast.success("Daily check complete", { description: `${r.dueSoon} due-soon, ${r.overdue} overdue and ${r.recommendations} recommendation alerts created.` });
              }}>
                <PlayCircle aria-hidden="true" /> Run daily check now
              </Button>
            )}
            <Button variant="outline" disabled={unread === 0} onClick={() => actions.markRead(items.filter(markable).map((n) => n.id))}><CheckCheck aria-hidden="true" /> Mark all as read</Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter notifications">
        {(["ALL", "UNREAD", ...types] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            aria-pressed={filter === t}
            className={cn("rounded-full border px-3 py-1 text-xs transition-colors", filter === t ? "border-gold bg-gold/10 text-gold-soft" : "border-border text-muted-foreground hover:text-ivory")}
          >
            {t === "ALL" ? "All" : t === "UNREAD" ? `Unread (${unread})` : TYPE_META[t].label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={BellOff} title={filter === "UNREAD" ? "You're all caught up." : "No notifications yet"} description="New alerts will appear here." />
      ) : (
        <ul className="grid gap-2">
          {visible.map((n) => {
            const meta = TYPE_META[n.type];
            const isUnread = markable(n);
            const member = n.memberId ? members.get(n.memberId) : null;
            return (
              <li key={n.id} className={cn("app-card fade-up flex gap-4 p-4 transition-colors", isUnread && "border-gold/30 bg-card")}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", meta.cls)}><meta.Icon className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className={cn("text-sm", isUnread ? "font-semibold text-ivory" : "text-ivory/85")}>{n.title}</p>
                    <span className="text-[10px] tracking-[.14em] text-muted-foreground uppercase">{meta.label}</span>
                    {isLibrarian && (
                      <span className="text-[11px] text-muted-foreground">
                        {member ? <>to <Link to="/members/$memberId" params={{ memberId: member.id }} className="text-gold-soft hover:underline">{member.name}</Link></> : <span className="inline-flex items-center gap-1"><Megaphone className="size-3" aria-hidden="true" /> Staff</span>}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                    <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                    {n.bookId && <Link to="/books/$bookId" params={{ bookId: n.bookId }} className="text-gold hover:text-gold-soft">View book</Link>}
                    {n.type === "RECOMMENDATION" && !isLibrarian && <Link to="/recommendations" className="text-gold hover:text-gold-soft">See picks</Link>}
                  </div>
                </div>
                {isUnread && (
                  <Button size="sm" variant="ghost" className="h-8 shrink-0 text-xs" onClick={() => actions.markRead([n.id])}>
                    <span className="mr-1 size-2 rounded-full bg-gold" aria-hidden="true" /> Mark read
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
