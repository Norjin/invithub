import type { EventRecord } from "@/server/types";
import { formatEventDate } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";

export function Hero({ event, children, compact = false }: { event: EventRecord; children?: React.ReactNode; compact?: boolean }) {
  const base = event.colors[0] ?? "#1e6b43";
  const coverUrl = event.coverPath ? `/api/events/${event.id}/cover` : null;
  return (
    <div
      className={`relative isolate overflow-hidden rounded-[20px] text-white ${compact ? "min-h-[180px]" : "min-h-[220px] md:min-h-[260px]"}`}
      style={{ background: base }}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      ) : (
        <Sparkles colors={event.colors} />
      )}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(0,0,0,0.65),rgba(0,0,0,0.05)_70%)]" />
      <div className="flex h-full min-h-[inherit] flex-col justify-end p-5 md:p-7">{children}</div>
    </div>
  );
}

/** Soft dots in the theme colors, standing in for a cover photo. */
function Sparkles({ colors }: { colors: string[] }) {
  const palette = colors.length > 1 ? colors.slice(1) : ["#f3e3b5"];
  const dots = Array.from({ length: 28 }, (_, i) => ({
    x: (i * 37) % 100,
    y: (i * 53) % 100,
    r: 2 + ((i * 7) % 5),
    c: palette[i % palette.length],
    o: 0.25 + ((i * 13) % 50) / 100,
  }));
  return (
    <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r / 6} fill={d.c} opacity={d.o} />
      ))}
    </svg>
  );
}

export function InvitationSummary({ event, hostName }: { event: EventRecord; hostName: string }) {
  return (
    <div className="card overflow-hidden">
      <Hero event={event} compact>
        <p className="font-serif text-[17px] italic opacity-90">You're invited</p>
        <h1 className="font-serif text-[40px] leading-[1.05] font-semibold">{event.title}</h1>
      </Hero>
      <div className="rows">
        <p className="subhead px-4 py-3">
          {formatEventDate(event.startsAt, event.timezone, "long")}
          {event.venueName && ` · ${event.venueName}`}
        </p>
        <p className="subhead flex items-center gap-2 px-4 py-3">
          <Avatar name={hostName} size={26} /> Hosted by {hostName}
        </p>
      </div>
    </div>
  );
}
