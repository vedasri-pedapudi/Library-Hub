import { useMemo } from "react";
import { useLibrary } from "@/services/store";
import type { Notification } from "@/services/types";

/**
 * Members see their own notifications. Librarians see staff alerts plus the
 * alert feed sent to members (read state is tracked on staff alerts only).
 */
export function useVisibleNotifications(): { items: Notification[]; unread: number } {
  const { data, isLibrarian, currentMemberId } = useLibrary();
  return useMemo(() => {
    const items = data.notifications
      .filter((n) => (isLibrarian ? true : n.memberId === currentMemberId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const unread = items.filter((n) => !n.readAt && (isLibrarian ? n.memberId === null : true)).length;
    return { items, unread };
  }, [data.notifications, isLibrarian, currentMemberId]);
}
