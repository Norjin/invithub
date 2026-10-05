import Link from "next/link";

export function SegmentedLinks({ items, active, label }: { items: { key: string; label: string; href: string }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-[10px] bg-fill p-0.5">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={it.key === active ? "page" : undefined}
          scroll={false}
          className={`rounded-[8px] px-4 py-1.5 text-[15px] font-medium transition-colors ${
            it.key === active ? "bg-surface text-label shadow-lift" : "text-label-2"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
