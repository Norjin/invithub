import type { DB } from "./db";
import { nowIso } from "./ids";
import type { EventRecord } from "./types";
import { describeWeatherCode, FORECAST_DAYS, geocodeCandidates, unitForCountry, type WeatherKind } from "@/domain/weather";
import { localDate } from "@/domain/time";
import { setCoordinates } from "./events";

export type Weather =
  | { status: "forecast"; day: string; high: number; low: number; precipitation: number | null; kind: WeatherKind; label: string; unit: "F" | "C" }
  | { status: "too_far"; availableFrom: string }
  | { status: "unavailable" };

const CACHE_MS = 3 * 60 * 60 * 1000;

async function geocode(event: EventRecord): Promise<{ lat: number; lon: number; country?: string } | null> {
  for (const name of geocodeCandidates(event.venueName, event.venueAddress)) {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(name)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { results?: { latitude: number; longitude: number; country_code?: string }[] };
      const hit = json.results?.[0];
      if (hit) return { lat: hit.latitude, lon: hit.longitude, country: hit.country_code };
    } catch {
      return null;
    }
  }
  return null;
}

export async function getEventWeather(db: DB, event: EventRecord, now = new Date()): Promise<Weather> {
  const day = localDate(new Date(event.startsAt), event.timezone);
  const daysAway = (new Date(event.startsAt).getTime() - now.getTime()) / 86_400_000;
  if (daysAway > FORECAST_DAYS - 1) {
    const from = new Date(new Date(event.startsAt).getTime() - (FORECAST_DAYS - 1) * 86_400_000);
    return { status: "too_far", availableFrom: localDate(from, event.timezone) };
  }
  if (daysAway < -1) return { status: "unavailable" };

  const cached = db.prepare("SELECT * FROM weather_cache WHERE event_id = ?").get(event.id) as
    | { day: string; payload: string; fetched_at: string }
    | undefined;
  if (cached && cached.day === day && now.getTime() - new Date(cached.fetched_at).getTime() < CACHE_MS) {
    return JSON.parse(cached.payload) as Weather;
  }

  let lat = event.latitude;
  let lon = event.longitude;
  let tempUnit = event.tempUnit;
  if (lat === null || lon === null) {
    if (!event.venueAddress && !event.venueName) return { status: "unavailable" };
    const geo = await geocode(event);
    if (!geo) return cached ? (JSON.parse(cached.payload) as Weather) : { status: "unavailable" };
    lat = geo.lat;
    lon = geo.lon;
    tempUnit = unitForCountry(geo.country);
    setCoordinates(db, event.id, lat, lon, tempUnit);
  }

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      temperature_unit: tempUnit,
      timezone: event.timezone,
      start_date: day,
      end_date: day,
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      daily: { weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] };
    };
    const d = json.daily;
    const { kind, label } = describeWeatherCode(d.weather_code[0]);
    const weather: Weather = {
      status: "forecast",
      day,
      high: Math.round(d.temperature_2m_max[0]),
      low: Math.round(d.temperature_2m_min[0]),
      precipitation: d.precipitation_probability_max?.[0] ?? null,
      kind,
      label,
      unit: tempUnit === "fahrenheit" ? "F" : "C",
    };
    db.prepare(
      `INSERT INTO weather_cache (event_id, day, payload, fetched_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(event_id) DO UPDATE SET day = excluded.day, payload = excluded.payload, fetched_at = excluded.fetched_at`,
    ).run(event.id, day, JSON.stringify(weather), nowIso());
    return weather;
  } catch {
    return cached ? (JSON.parse(cached.payload) as Weather) : { status: "unavailable" };
  }
}
