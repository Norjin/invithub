import type { ReactNode } from "react";

export function Section({
  title,
  action,
  footer,
  children,
  className = "",
  padded = false,
}: {
  title?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-2 flex items-end justify-between gap-3 px-4">
          {title && <h2 className="headline">{title}</h2>}
          {action}
        </div>
      )}
      <div className={`card overflow-hidden ${padded ? "p-4" : ""}`}>{children}</div>
      {footer && <p className="footnote mt-2 px-4 text-label-2">{footer}</p>}
    </section>
  );
}

export function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-h-[48px] items-center gap-3 px-4 py-2.5 ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="footnote mb-0.5 text-label-2">{eyebrow}</p>}
        <h1 className="large-title truncate">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, note, tone = "label" }: { label: string; value: ReactNode; note?: ReactNode; tone?: "label" | "accent" }) {
  return (
    <div className="card flex flex-col p-4">
      <span className="subhead text-label-2">{label}</span>
      <span className={`mt-1 text-[34px] leading-none font-bold tabular-nums ${tone === "accent" ? "text-accent" : ""}`}>{value}</span>
      {note && <span className="footnote mt-2 text-label-2">{note}</span>}
    </div>
  );
}
