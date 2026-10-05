import Link from "next/link";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { requireMember } from "@/server/session";
import { getDb } from "@/server/db";
import { getEventWeather } from "@/server/weather";
import { listPosts } from "@/server/posts";
import { listMedia } from "@/server/media";
import { santaRecipientFor } from "@/server/santa";
import { parsePlaylistUrl } from "@/domain/playlist";
import { formatDay, formatEventDate, timeAgo } from "@/lib/format";
import { Hero } from "@/components/event/invitation-card";
import { DetailRows, PlaylistCard, ThemeCard, WeatherCard } from "@/components/event/event-details";
import { SecretSantaCard } from "@/components/event/secret-santa-card";
import { StatusCapsule } from "@/components/ui/status-capsule";
import { Avatar } from "@/components/ui/avatar";

export default async function GuestEventPage({ params }: PageProps<"/e/[eventId]">) {
  const { eventId } = await params;
  const { event, invite, isAdmin } = await requireMember(eventId);
  const db = getDb();
  const approved = isAdmin || (invite && invite.status !== "pending");
  const weather = await getEventWeather(db, event);
  const playlist = parsePlaylistUrl(event.playlistUrl);
  const posts = approved ? listPosts(db, eventId).slice(0, 2) : [];
  const photos = approved ? listMedia(db, eventId).slice(0, 4) : [];
  const host = db.prepare("SELECT name FROM users WHERE id = ?").get(event.hostUserId) as { name: string };
  const santa = invite?.status === "confirmed" && event.santaDrawnAt ? santaRecipientFor(db, eventId, invite.id) : null;
  const showSanta = invite?.status === "confirmed" && (event.giftBudget || event.santaDrawnAt);

  return (
    <div className="space-y-4 md:space-y-5">
      <Hero event={event}>
        <h1 className="text-[34px] leading-tight font-bold md:text-[48px]">{event.title}</h1>
        <p className="subhead mt-1 opacity-95 md:text-[17px]">
          {formatEventDate(event.startsAt, event.timezone, "long")}
          {event.venueName && <span className="hidden md:inline"> · {event.venueName}</span>}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {invite && (
            <span className="rounded-full bg-surface">
              <StatusCapsule status={invite.status} />
            </span>
          )}
          <a href={`/api/events/${eventId}/ics`} className="btn btn-sm bg-surface text-label">
            <CalendarPlus aria-hidden size={16} /> Add to Calendar
          </a>
        </div>
      </Hero>

      <div className="grid gap-4 md:grid-cols-[1fr_340px] md:gap-5">
        <div className="space-y-4 md:space-y-5">
          <div className="card flex items-center gap-3 p-4">
            <Avatar name={host.name} />
            <span className="flex-1">
              Hosted by <span className="font-medium">{host.name}</span>
            </span>
            {invite?.status === "approved" && (
              <Link href={`/e/${eventId}/pass`} className="btn btn-primary btn-sm">
                RSVP
              </Link>
            )}
          </div>

          <div className="md:hidden">
            <DetailRows venueName={event.venueName} venueAddress={event.venueAddress} weather={weather} playlist={playlist} />
          </div>
          <div className="md:hidden">
            <ThemeCard theme={event.theme} dressCode={event.dressCode} colors={event.colors} />
          </div>

          {event.description && (
            <section className="card p-4">
              <h2 className="headline">About</h2>
              <p className="mt-1 whitespace-pre-wrap text-label-2">{event.description}</p>
            </section>
          )}

          {event.venueAddress && (
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent([event.venueName, event.venueAddress].filter(Boolean).join(", "))}`}
              target="_blank"
              rel="noreferrer"
              className="card hidden items-center gap-3 p-4 md:flex"
            >
              <span className="flex-1">
                <span className="headline block">{event.venueName || "Location"}</span>
                <span className="subhead block text-label-2">{event.venueAddress}</span>
              </span>
              <ChevronRight aria-hidden size={18} className="text-label-3" />
            </a>
          )}

          {posts.length > 0 && (
            <section className="card overflow-hidden">
              <Link href={`/e/${eventId}/updates`} className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="headline">Updates from the host</h2>
                <span className="footnote text-accent">See all</span>
              </Link>
              <ul className="rows">
                {posts.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar name={p.authorName} size={30} />
                    <p className="min-w-0 flex-1 line-clamp-2">{p.body}</p>
                    <span className="footnote shrink-0 text-label-2">{timeAgo(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {photos.length > 0 && (
            <section className="card p-4">
              <Link href={`/e/${eventId}/updates?tab=moments`} className="mb-3 flex items-center justify-between">
                <h2 className="headline">Shared moments</h2>
                <span className="footnote text-accent">View all</span>
              </Link>
              <ul className="grid grid-cols-4 gap-2">
                {photos.map((m) => (
                  <li key={m.id} className="aspect-square overflow-hidden rounded-xl bg-fill">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/media/${m.id}`} alt={`Photo by ${m.userName}`} loading="lazy" className="h-full w-full object-cover" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="hidden space-y-5 md:block">
          <WeatherCard weather={weather} dayLabel={formatDay(event.startsAt, event.timezone)} />
          <ThemeCard theme={event.theme} dressCode={event.dressCode} colors={event.colors} />
          <PlaylistCard playlist={playlist} />
          {showSanta && <SecretSantaCard recipient={santa?.name ?? null} budget={event.giftBudget} />}
        </aside>
        {showSanta && (
          <div className="md:hidden">
            <SecretSantaCard recipient={santa?.name ?? null} budget={event.giftBudget} />
          </div>
        )}
      </div>
    </div>
  );
}
