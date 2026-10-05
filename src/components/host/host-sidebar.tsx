"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Snowflake } from "lucide-react";
import { NAV_ICONS } from "@/components/ui/nav-icons";
import { isActive, type NavItem } from "@/components/ui/tab-bar";

export function HostSidebar({ title, date, items, footer }: { title: string; date: string; items: NavItem[][]; footer: NavItem[] }) {
  const pathname = usePathname();
  const link = (item: NavItem) => {
    const active = isActive(pathname, item);
    const Icon = NAV_ICONS[item.icon];
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[40px] items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors ${
          active ? "bg-accent text-on-accent" : "text-label hover:bg-fill"
        }`}
      >
        <Icon aria-hidden size={19} />
        {item.label}
      </Link>
    );
  };
  return (
    <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-[0.5px] border-separator p-3 md:flex">
      <Link href="/" className="mb-5 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-fill">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Snowflake aria-hidden size={20} />
        </span>
        <span className="min-w-0">
          <span className="headline block truncate">{title}</span>
          <span className="footnote block text-label-2">{date}</span>
        </span>
      </Link>
      <nav aria-label="Host" className="flex flex-1 flex-col gap-3">
        {items.map((group, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {group.map(link)}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-0.5 border-t-[0.5px] border-separator pt-3">{footer.map(link)}</div>
    </aside>
  );
}
