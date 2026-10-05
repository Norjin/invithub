import {
  CalendarDays,
  Bell,
  Radio,
  Ticket,
  LayoutGrid,
  Users,
  Armchair,
  Ellipsis,
  ListChecks,
  Mail,
  Megaphone,
  Settings,
  Eye,
} from "lucide-react";

export const NAV_ICONS = {
  event: CalendarDays,
  updates: Bell,
  live: Radio,
  pass: Ticket,
  overview: LayoutGrid,
  guests: Users,
  seating: Armchair,
  more: Ellipsis,
  prepare: ListChecks,
  invite: Mail,
  posts: Megaphone,
  settings: Settings,
  preview: Eye,
} as const;

export type NavIcon = keyof typeof NAV_ICONS;
