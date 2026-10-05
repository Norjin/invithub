import Link from "next/link";
import { ChevronRight, Plus, UserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { StatusCapsule } from "@/components/ui/status-capsule";
import { getDb } from "@/server/db";
import { listEventsForUser } from "@/server/events";
import { currentUser } from "@/server/session";
import { formatEventDate } from "@/lib/format";

export default async function Home() {
  const user = await currentUser();
  if (!user) return <Landing />;

  const events = listEventsForUser(getDb(), user.id);
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.event.startsAt).getTime() > now - 86_400_000 && !e.event.endedAt);
  const past = events.filter((e) => !upcoming.includes(e));

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <Brand />
        <Link href="/account" className="btn btn-secondary btn-sm" aria-label="Account">
          <UserRound aria-hidden size={18} />
          {user.name.split(" ")[0]}
        </Link>
      </header>
      <div className="mb-6 flex items-end justify-between gap-3">
        <h1 className="large-title">Your parties</h1>
        <Link href="/host/new" className="btn btn-primary">
          <Plus aria-hidden size={20} /> New party
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="headline">No parties yet</p>
          <p className="subhead mt-1 text-label-2">Create one, or open the invite link or QR code your host shared.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { title: "Upcoming", list: upcoming },
            { title: "Past", list: past },
          ]
            .filter((g) => g.list.length)
            .map((g) => (
              <section key={g.title}>
                <h2 className="headline mb-2 px-4">{g.title}</h2>
                <ul className="card rows overflow-hidden">
                  {g.list.map(({ event, role, status }) => (
                    <li key={event.id}>
                      <Link href={role === "admin" ? `/host/${event.id}` : `/e/${event.id}`} className="flex items-center gap-3 px-4 py-3.5">
                        <span
                          aria-hidden
                          className="size-11 shrink-0 rounded-xl"
                          style={{ background: event.colors[0] ?? "var(--accent)" }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="headline block truncate">{event.title}</span>
                          <span className="footnote block text-label-2">{formatEventDate(event.startsAt, event.timezone)}</span>
                        </span>
                        {role === "admin" ? (
                          <span className="footnote rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">Host</span>
                        ) : (
                          status && <StatusCapsule status={status} />
                        )}
                        <ChevronRight aria-hidden size={18} className="text-label-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <Brand />
      <h1 className="mt-8 text-[44px] leading-[1.05] font-bold tracking-tight md:text-[56px]">Throw the party. We'll handle the guest list.</h1>
      <p className="mt-4 text-[19px] text-label-2">
        Invite with a QR code, track RSVPs, seat everyone with their plus-ones, run Secret Santa, and keep the night going with live questions and a
        raffle.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signin?next=/host/new" className="btn btn-primary">
          Create a party
        </Link>
        <Link href="/signin" className="btn btn-secondary">
          Sign in
        </Link>
      </div>
    </main>
  );
}
