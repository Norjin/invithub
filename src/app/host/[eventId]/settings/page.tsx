import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { listAdminIds } from "@/server/events";
import { updateEventAction } from "@/app/actions/events";
import { utcToZonedInput } from "@/domain/time";
import { EventForm } from "@/components/host/event-form";
import { CoverRemove } from "@/components/host/cover-remove";
import { PhotoUploader } from "@/components/event/photo-uploader";
import { Hero } from "@/components/event/invitation-card";
import { PageHeader, Section } from "@/components/ui/section";

export const metadata = { title: "Event settings" };

export default async function SettingsPage({ params }: PageProps<"/host/[eventId]/settings">) {
  const { eventId } = await params;
  const { event } = await requireAdmin(eventId);
  const db = getDb();
  const adminIds = [...listAdminIds(db, eventId)];
  const admins = adminIds.map((id) => db.prepare("SELECT name FROM users WHERE id = ?").get(id) as { name: string });
  const endpoint = `/api/events/${eventId}/cover`;

  return (
    <>
      <PageHeader eyebrow={event.title} title="Event settings" />
      <div className="max-w-2xl space-y-8">
        <Section title="Cover photo" padded footer="Shown at the top of the event page and the join page.">
          <Hero event={event} compact>
            <p className="title-2">{event.title}</p>
          </Hero>
          <div className="mt-3 flex items-center gap-2">
            <PhotoUploader endpoint={endpoint} label={event.coverPath ? "Replace cover" : "Upload cover"} tile={false} />
            {event.coverPath && <CoverRemove endpoint={endpoint} />}
          </div>
        </Section>

        <EventForm
          action={updateEventAction.bind(null, eventId)}
          submitLabel="Save changes"
          initial={{
            title: event.title,
            description: event.description,
            theme: event.theme,
            dressCode: event.dressCode,
            colors: event.colors,
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            timezone: event.timezone,
            startsAt: utcToZonedInput(new Date(event.startsAt), event.timezone),
            rsvpClosesAt: utcToZonedInput(new Date(event.rsvpClosesAt), event.timezone),
            playlistUrl: event.playlistUrl,
            giftBudget: event.giftBudget,
            defaultPlusOnes: event.defaultPlusOnes,
          }}
        />

        <Section title="Admins" padded footer="Make a guest an admin from their row on the Guests page.">
          <p className="subhead">{admins.map((a) => a.name).join(", ")}</p>
        </Section>
      </div>
    </>
  );
}
