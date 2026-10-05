import Link from "next/link";
import { Armchair, CalendarDays, Star, UserRound } from "lucide-react";
import { requireMember } from "@/server/session";
import { getDb } from "@/server/db";
import { getInviteWithPlusOnes } from "@/server/invites";
import { santaRecipientFor } from "@/server/santa";
import { appUrl } from "@/server/url";
import { formatEventDate } from "@/lib/format";
import { QR } from "@/components/ui/qr";
import { StatusCapsule } from "@/components/ui/status-capsule";
import { RsvpControls } from "@/components/event/rsvp-controls";
import { SecretSantaCard } from "@/components/event/secret-santa-card";

export const metadata = { title: "Pass" };

export default async function PassPage({ params }: PageProps<"/e/[eventId]/pass">) {
  const { eventId } = await params;
  const { event, invite: base, isAdmin } = await requireMember(eventId);
  const db = getDb();

  if (!base) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="large-title mb-4">Pass</h1>
        <div className="card p-5">
          <p className="subhead text-label-2">You're hosting, so you don't need a pass. Scan guests in from the Live page.</p>
          {isAdmin && (
            <Link href={`/host/${eventId}/live`} className="btn btn-primary mt-4 w-full">
              Open check-in
            </Link>
          )}
        </div>
      </div>
    );
  }

  const invite = getInviteWithPlusOnes(db, base.id)!;
  const table = invite.tableId ? (db.prepare("SELECT name FROM tables_ WHERE id = ?").get(invite.tableId) as { name: string } | undefined) : undefined;
  const rsvpClosed = Date.now() >= new Date(event.rsvpClosesAt).getTime();
  const santa = invite.status === "confirmed" && event.santaDrawnAt ? santaRecipientFor(db, eventId, invite.id) : null;
  const showPass = invite.status === "confirmed";

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="large-title">Pass</h1>

      {showPass ? (
        <section aria-label="Event pass" className="card relative overflow-hidden">
          <span aria-hidden className="absolute inset-y-0 left-0 w-3 bg-accent" />
          <div className="border-b-[0.5px] border-dashed border-separator py-4 pr-4 pl-7">
            <p className="headline flex items-center gap-2">
              <Star aria-hidden size={16} className="text-accent" fill="currentColor" /> {event.title}
            </p>
            <p className="footnote mt-1 flex items-center gap-1.5 text-label-2">
              <CalendarDays aria-hidden size={14} /> {formatEventDate(event.startsAt, event.timezone)}
            </p>
          </div>
          <div className="flex flex-col items-center py-5 pr-4 pl-7">
            <p className="subhead flex items-center gap-2 self-start text-label-2">
              <UserRound aria-hidden size={16} /> Guest <span className="font-semibold text-label">{invite.name}</span>
              {invite.plusOnes.length > 0 && <span>+ {invite.plusOnes.length}</span>}
            </p>
            <div className="mt-4">
              <QR value={appUrl(`/host/${eventId}/checkin/${invite.passCode}`)} size={190} label={`Check-in code ${invite.passCode}`} />
            </div>
            <p className="mt-2 font-mono text-[17px] tracking-[0.3em]">{invite.passCode}</p>
            <p className="footnote mt-1 text-label-2">{invite.checkedInAt ? "Checked in" : "Show at the door to check in"}</p>
            {table && (
              <p className="subhead mt-3 flex items-center gap-2 font-medium">
                <Armchair aria-hidden size={18} className="text-accent" /> {table.name}
              </p>
            )}
          </div>
        </section>
      ) : (
        <div className="card flex items-center justify-between gap-3 p-4">
          <span className="subhead text-label-2">{invite.status === "pending" ? "Your pass appears once you're approved and confirm." : "Confirm you're going to get your pass."}</span>
          <StatusCapsule status={invite.status} />
        </div>
      )}

      {invite.status !== "pending" && (
        <section className="card p-4">
          <h2 className="headline mb-3">Your RSVP</h2>
          <RsvpControls
            eventId={eventId}
            status={invite.status}
            locked={rsvpClosed}
            lockedReason={rsvpClosed ? "RSVPs are closed. Ask the host if something changed." : `RSVPs close ${formatEventDate(event.rsvpClosesAt, event.timezone)}.`}
            allowance={invite.plusOneAllowance}
            plusOnes={invite.plusOnes.map((p) => p.name)}
          />
        </section>
      )}

      {invite.status === "confirmed" && (event.giftBudget || event.santaDrawnAt) && <SecretSantaCard recipient={santa?.name ?? null} budget={event.giftBudget} />}
    </div>
  );
}
