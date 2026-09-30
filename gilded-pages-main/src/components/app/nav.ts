import { BarChart3, Bell, BookMarked, BookOpen, Heart, Home, LayoutDashboard, Library, Settings, Sparkles, TriangleAlert, User, Users, ArrowRightLeft, type LucideIcon } from "lucide-react";
import type { Role } from "@/services/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (max 5 per role). */
  mobile?: boolean;
  badge?: "notifications" | "overdue" | "loans";
}

export const NAV: Record<Role | "guest", NavItem[]> = {
  guest: [
    { to: "/", label: "Home", icon: Home, mobile: true },
    { to: "/catalog", label: "Catalog", icon: Library, mobile: true },
  ],
  member: [
    { to: "/", label: "Home", icon: Home, mobile: true },
    { to: "/catalog", label: "Catalog", icon: Library, mobile: true },
    { to: "/loans", label: "My Loans", icon: BookOpen, mobile: true, badge: "loans" },
    { to: "/recommendations", label: "Recommendations", icon: Sparkles, mobile: true },
    { to: "/saved", label: "Saved", icon: Heart },
    { to: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
    { to: "/profile", label: "Profile", icon: User, mobile: true },
  ],
  librarian: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
    { to: "/catalog", label: "Catalog", icon: Library, mobile: true },
    { to: "/manage/books", label: "Books", icon: BookMarked },
    { to: "/members", label: "Members", icon: Users, mobile: true },
    { to: "/manage/loans", label: "Loans", icon: ArrowRightLeft, mobile: true },
    { to: "/overdue", label: "Overdue", icon: TriangleAlert, badge: "overdue", mobile: true },
    { to: "/recommendations", label: "Recommendations", icon: Sparkles },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/notifications", label: "Alerts", icon: Bell, badge: "notifications" },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
};

/** Routes only librarians may open. Members are redirected with a notice. */
export const LIBRARIAN_ONLY = ["/dashboard", "/manage", "/members", "/overdue", "/analytics", "/settings"];
