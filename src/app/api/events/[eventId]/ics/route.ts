import { getDb } from "@/server/db";
import { getEvent, inviteForUser, isEventAdmin } from "@/server/events";
import { currentUser } from "@/server/session";
import { appUrl } from "@/server/url";

const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

export async function GET(_req: Request, ctx: RouteContext<"/api/events/[eventId]/ics">) {
  const { eventId } = await ctx.params;
  const user = await currentUser();
  const db = getDb();
  const event = getEvent(db, eventId);
  if (!user || !event || (!inviteForUser(db, eventId, user.id) && !isEventAdmin(db, eventId, user.id))) {
    return new Response("Not found", { status: 404 });
  }
  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InvitHub//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@invithub`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(start.toISOString())}`,
    `DTEND:${stamp(end.toISOString())}`,
    `SUMMARY:${esc(event.title)}`,
    `LOCATION:${esc([event.venueName, event.venueAddress].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(`${event.description}\n\n${appUrl(`/e/${event.id}`)}`)}`,
    `URL:${appUrl(`/e/${event.id}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${event.title.replace(/[^\w -]/g, "")}.ics"` },
  });
}
