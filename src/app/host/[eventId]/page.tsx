import Link from "next/link";
import { Check, ChevronRight, Lock, QrCode, Send } from "lucide-react";
import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { getOverview } from "@/server/overview";
import { listTodos } from "@/server/todos";
import { eventPhase } from "@/server/events";
import { PageHeader, Section, Stat } from "@/components/ui/section";
import { formatCalendarDate, formatDay, formatEventDate } from "@/lib/format";

export default async function OverviewPage({ params }: PageProps<"/host/[eventId]">) {
  const { eventId } = await params;
  const { event } = await requireAdmin(eventId);
  const db = getDb();
  const c = getOverview(db, eventId);
  const todos = listTodos(db, eventId);
  const open = todos.filter((t) => !t.doneAt);
  const phase = eventPhase(event);
  const rsvpOpen = Date.now() < new Date(event.rsvpClosesAt).getTime();
  const base = `/host/${eventId}`;

  const segments = [
    { key: "Confirmed", n: c.confirmed, cls: "bg-ok" },
    { key: "Approved", n: c.approved, cls: "bg-info" },
    { key: "Pending", n: c.pending, cls: "bg-muted" },
    { key: "Not going", n: c.notGoing, cls: "bg-danger" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`${event.title} · ${formatEventDate(event.startsAt, event.timezone)}`}
        title="Overview"
        actions={
          <>
            <Link href={`${base}/invite`} className="btn btn-secondary">
              <QrCode aria-hidden size={18} /> Show QR
            </Link>
            <Link href={`${base}/invite`} className="btn btn-primary hidden sm:inline-flex">
              <Send aria-hidden size={18} /> Send invites
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invited" value={c.invited} tone="accent" />
        <Stat label="Attending" value={c.attending} tone="accent" note={c.attendingPlusOnes ? `incl. ${c.attendingPlusOnes} plus-ones` : "Confirmed guests"} />
        <Stat label="Pending" value={c.pending} note={c.pending ? <Link className="text-accent" href={`${base}/guests?status=pending`}>Review requests</Link> : undefined} />
        <Stat label="Not going" value={c.notGoing} />
      </div>

      <div className="card mt-3 flex items-center gap-3 p-4">
        <span className="subhead flex-1">Checked in</span>
        <span className="text-[28px] font-bold tabular-nums">{c.checkedIn}</span>
        {phase === "upcoming" ? (
          <span className="footnote flex items-center gap-1 text-label-2">
            <Lock aria-hidden size={14} /> opens {formatDay(event.startsAt, event.timezone)}
          </span>
        ) : (
          <span className="footnote text-label-2">of {c.attending}</span>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Section title="RSVP status" padded>
          {c.invited === 0 ? (
            <p className="subhead text-label-2">No guests yet. Share your QR code or add guests to get started.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-fill" role="img" aria-label={segments.map((s) => `${s.key} ${s.n}`).join(", ")}>
                {segments.map((s) => s.n > 0 && <span key={s.key} className={s.cls} style={{ width: `${(s.n / c.invited) * 100}%` }} />)}
              </div>
              <ul className="footnote mt-3 flex flex-wrap gap-x-4 gap-y-1 text-label-2">
                {segments.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span aria-hidden className={`size-2 rounded-full ${s.cls}`} /> {s.key} <span className="text-label tabular-nums">{s.n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="footnote mt-4 text-label-2">
            {rsvpOpen
              ? `RSVPs close ${formatEventDate(event.rsvpClosesAt, event.timezone)}.`
              : `RSVPs closed. ${c.seated} of ${c.attending} seated.`}
          </p>
        </Section>

        <Section
          title="Next up"
          action={
            <Link href={`${base}/prepare`} className="footnote text-accent">
              {todos.length - open.length} of {todos.length} done
            </Link>
          }
        >
          {open.length === 0 ? (
            <p className="subhead flex items-center gap-2 p-4 text-label-2">
              <Check aria-hidden size={18} className="text-ok" /> Everything's ready.
            </p>
          ) : (
            <ul className="rows">
              {open.slice(0, 4).map((t) => {
                const locked = t.title === "Assign tables" && rsvpOpen;
                return (
                  <li key={t.id}>
                    <Link
                      href={t.title === "Assign tables" ? `${base}/seating` : `${base}/prepare`}
                      className="flex min-h-[52px] items-center gap-3 px-4 py-2.5"
                    >
                      <span aria-hidden className="size-5 shrink-0 rounded-full border-[1.5px] border-label-3" />
                      <span className="min-w-0 flex-1">
                        <span className="block">{t.title}</span>
                        {(t.dueDate || locked) && (
                          <span className="footnote block text-label-2">
                            {locked ? `After RSVPs close ${formatDay(event.rsvpClosesAt, event.timezone)}` : formatCalendarDate(t.dueDate!)}
                          </span>
                        )}
                      </span>
                      <ChevronRight aria-hidden size={18} className="text-label-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <Link href={`${base}/invite`} className="btn btn-primary mt-8 w-full sm:hidden">
        <Send aria-hidden size={18} /> Send invites
      </Link>
    </>
  );
}
