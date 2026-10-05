"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, type NavItem } from "@/components/ui/tab-bar";

export function GuestTopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Event" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative px-4 py-4 text-[15px] font-medium ${active ? "text-accent" : "text-label-2 hover:text-label"}`}
          >
            {item.label}
            {active && <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" />}
            {item.badge && !active && <span aria-label="New" className="absolute top-3.5 right-2 size-1.5 rounded-full bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}
