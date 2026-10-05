import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { listInvites } from "@/server/invites";
import { listAdminIds } from "@/server/events";
import { listTables } from "@/server/seating";
import { isInviteStatus } from "@/domain/invite-status";
import { PageHeader } from "@/components/ui/section";
import { GuestList, type GuestRow } from "@/components/host/guest-list";

export const metadata = { title: "Guests" };

export default async function GuestsPage({ params, searchParams }: PageProps<"/host/[eventId]/guests">) {
  const { eventId } = await params;
  const { status } = await searchParams;
  const { event } = await requireAdmin(eventId);
  const db = getDb();
  const admins = listAdminIds(db, eventId);
  const tables = new Map(listTables(db, eventId).map((t) => [t.id, t.name]));
  const guests: GuestRow[] = listInvites(db, eventId).map((i) => ({
    id: i.id,
    name: i.name,
    contact: i.contact,
    channel: i.channel,
    status: i.status,
    plusOnes: i.plusOnes.map((p) => p.name),
    plusOneAllowance: i.plusOneAllowance,
    checkedIn: !!i.checkedInAt,
    isAdmin: !!i.userId && admins.has(i.userId),
    isHost: i.userId === event.hostUserId,
    hasAccount: !!i.userId,
    passCode: i.passCode,
    tableName: i.tableId ? (tables.get(i.tableId) ?? null) : null,
  }));
  return (
    <>
      <PageHeader eyebrow={event.title} title="Guests" />
      <GuestList eventId={eventId} guests={guests} filter={isInviteStatus(status) ? status : "all"} />
    </>
  );
}
