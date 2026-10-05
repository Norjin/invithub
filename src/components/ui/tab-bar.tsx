"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, type NavIcon } from "./nav-icons";

export type NavItem = { href: string; label: string; icon: NavIcon; exact?: boolean; badge?: boolean; matches?: string[] };

export function isActive(pathname: string, item: NavItem): boolean {
  const paths = [item.href, ...(item.matches ?? [])];
  return paths.some((p) => (item.exact ? pathname === p : pathname === p || pathname.startsWith(`${p}/`)));
}

/** Floating glass tab bar for phones; hidden from md up, where the top nav or sidebar takes over. */
export function TabBar({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="glass fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md rounded-[28px] p-1.5 shadow-lift md:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11px] font-medium transition-colors ${
              active ? "bg-accent-soft text-accent" : "text-label-2"
            }`}
          >
            <Icon aria-hidden size={22} strokeWidth={active ? 2.2 : 1.8} />
            {item.label}
            {item.badge && <span aria-label="New" className="absolute top-2 right-[calc(50%-16px)] size-2 rounded-full bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}
