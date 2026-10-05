import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplet, MapPin, Music, Play, Sun } from "lucide-react";
import type { Weather } from "@/server/weather";
import type { WeatherKind } from "@/domain/weather";
import type { PlaylistLink } from "@/domain/playlist";
import { formatCalendarDate } from "@/lib/format";

const WEATHER_ICON: Record<WeatherKind, typeof Sun> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

function mapsUrl(q: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
}

/** Venue, weather and playlist rows. Rows with nothing to show are left out. */
export function DetailRows({ venueName, venueAddress, weather, playlist }: { venueName: string; venueAddress: string; weather: Weather; playlist: PlaylistLink | null }) {
  const place = [venueName, venueAddress].filter(Boolean).join(", ");
  const rows: React.ReactNode[] = [];
  if (place) {
    rows.push(
      <a key="place" href={mapsUrl(place)} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center gap-3 px-4 py-2.5">
        <MapPin aria-hidden size={20} className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{venueName || venueAddress}</span>
          {venueName && venueAddress && <span className="footnote block truncate text-label-2">{venueAddress}</span>}
        </span>
      </a>,
    );
  }
  if (weather.status === "forecast") {
    const Icon = WEATHER_ICON[weather.kind] ?? Cloud;
    rows.push(
      <div key="weather" className="flex min-h-[48px] items-center gap-3 px-4 py-2.5" data-testid="weather-row">
        <Icon aria-hidden size={20} className="shrink-0 text-gold" />
        <span className="flex-1">
          Weather · {weather.high}° / {weather.low}° · {weather.label}
        </span>
        {weather.precipitation !== null && weather.precipitation > 0 && (
          <span className="footnote flex items-center gap-1 text-info">
            <Droplet aria-hidden size={12} /> {weather.precipitation}%
          </span>
        )}
      </div>,
    );
  } else if (weather.status === "too_far") {
    rows.push(
      <div key="weather" className="flex min-h-[48px] items-center gap-3 px-4 py-2.5 text-label-2" data-testid="weather-row">
        <CloudSun aria-hidden size={20} className="shrink-0" />
        <span>Forecast available from {formatCalendarDate(weather.availableFrom)}</span>
      </div>,
    );
  }
  if (playlist) {
    rows.push(
      <a key="playlist" href={playlist.url} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center gap-3 px-4 py-2.5">
        <Music aria-hidden size={20} className="shrink-0 text-accent" />
        <span className="flex-1">Party playlist</span>
        <span className="footnote text-label-2">{playlist.provider === "Link" ? "Open" : playlist.provider}</span>
      </a>,
    );
  }
  if (rows.length === 0) return null;
  return <div className="card rows overflow-hidden">{rows}</div>;
}

export function WeatherCard({ weather, dayLabel }: { weather: Weather; dayLabel: string }) {
  if (weather.status === "unavailable") return null;
  if (weather.status === "too_far") {
    return (
      <div className="card p-4" data-testid="weather-card">
        <p className="headline">Weather on {dayLabel}</p>
        <p className="subhead mt-1 text-label-2">Forecast available from {formatCalendarDate(weather.availableFrom)}.</p>
      </div>
    );
  }
  const Icon = WEATHER_ICON[weather.kind] ?? Cloud;
  return (
    <div className="card p-4" data-testid="weather-card">
      <div className="flex items-start justify-between">
        <p className="headline">Weather on {dayLabel}</p>
        <Icon aria-hidden size={32} className="text-gold" />
      </div>
      <p className="mt-1 text-[34px] leading-tight font-semibold tabular-nums">
        {weather.high}° <span className="text-label-2">/ {weather.low}°</span>
      </p>
      <p className="subhead text-label-2">{weather.label}</p>
      {weather.precipitation !== null && (
        <p className="footnote mt-2 flex items-center gap-1 text-info">
          <Droplet aria-hidden size={13} /> {weather.precipitation}% chance of rain
        </p>
      )}
    </div>
  );
}

export function ThemeCard({ theme, dressCode, colors }: { theme: string; dressCode: string; colors: string[] }) {
  if (!theme && !dressCode && colors.length === 0) return null;
  return (
    <div className="card p-4">
      <p className="headline">Theme &amp; dress code</p>
      {colors.length > 0 && (
        <ul className="mt-3 flex gap-2" aria-label="Theme colors">
          {colors.map((c, i) => (
            <li key={i} className="size-9 rounded-full border-[0.5px] border-separator" style={{ background: c }} title={c} />
          ))}
        </ul>
      )}
      {(theme || dressCode) && (
        <p className="subhead mt-3 text-label-2">
          {theme && <span className="font-medium text-label">{theme}</span>}
          {theme && dressCode && " · "}
          {dressCode}
        </p>
      )}
    </div>
  );
}

export function PlaylistCard({ playlist }: { playlist: PlaylistLink | null }) {
  if (!playlist) return null;
  return (
    <a href={playlist.url} target="_blank" rel="noreferrer" className="card flex items-center gap-3 p-4">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Music aria-hidden size={26} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="headline block">Playlist</span>
        <span className="subhead block text-label-2">{playlist.provider === "Link" ? "Open link" : `Listen on ${playlist.provider}`}</span>
      </span>
      <span className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent">
        <Play aria-hidden size={18} fill="currentColor" />
      </span>
    </a>
  );
}
