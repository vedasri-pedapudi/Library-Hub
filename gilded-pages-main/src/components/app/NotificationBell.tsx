import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useLibrary } from "@/services/store";
import { useVisibleNotifications } from "@/features/notifications/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationBell({ className }: { className?: string | undefined }) {
  const { isLibrarian } = useLibrary();
  const { unread } = useVisibleNotifications();
  const [pop, setPop] = useState(false);
  const prev = useRef(unread);

  // Animate the badge whenever a new alert arrives.
  useEffect(() => {
    if (unread > prev.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 600);
      prev.current = unread;
      return () => clearTimeout(t);
    }
    prev.current = unread;
    return undefined;
  }, [unread]);

  return (
    <Link to="/notifications" className={cn("header-icon-btn", className)} aria-label={`${isLibrarian ? "Alerts" : "Notifications"}${unread ? `, ${unread} unread` : ""}`}>
      <Bell className="size-4" aria-hidden="true" />
      {unread > 0 && (
        <span className={cn("absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] leading-[18px] font-semibold text-ink", pop && "badge-pop")}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
