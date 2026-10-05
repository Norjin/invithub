import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { listInvites } from "@/server/invites";
import { listTables } from "@/server/seating";
import { getOverview } from "@/server/overview";
import { isSeatingOpen } from "@/domain/seating";
import { formatEventDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/section";
import { SeatingBoard } from "@/components/host/seating-board";

export const metadata = { title: "Seating" };

export default async function SeatingPage({ params }: PageProps<"/host/[eventId]/seating">) {
  const { eventId } = await params;
  const { event } = await requireAdmin(eventId);
  const db = getDb();
  const open = isSeatingOpen(new Date(event.rsvpClosesAt), new Date());
  const c = getOverview(db, eventId);
  const parties = listInvites(db, eventId)
    .filter((i) => i.status === "confirmed")
    .map((i) => ({ inviteId: i.id, name: i.name, plusOnes: i.plusOnes.map((p) => p.name), tableId: i.tableId }));
  return (
    <>
      <PageHeader
        eyebrow={open ? `RSVPs closed · ${c.attending} attending · ${c.seated} seated` : `${c.attending} attending so far`}
        title="Seating"
      />
      <SeatingBoard
        eventId={eventId}
        open={open}
        opensLabel={formatEventDate(event.rsvpClosesAt, event.timezone)}
        tables={listTables(db, eventId).map((t) => ({ id: t.id, name: t.name, capacity: t.capacity }))}
        parties={parties}
      />
    </>
  );
}
