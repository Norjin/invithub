import { z } from "zod";
import type { DB } from "./db";
import { newId, nowIso, urlToken } from "./ids";
import { toEvent, toInvite } from "./rows";
import { AppError, CARD_STYLES, type EventRecord, type Invite } from "./types";
import { isValidTimeZone, zonedTimeToUtc } from "@/domain/time";
import { parsePlaylistUrl } from "@/domain/playlist";

const HEX = /^#[0-9a-fA-F]{6}$/;

export const eventInputSchema = z.object({
  title: z.string().trim().min(1, "Give your party a name.").max(120),
  description: z.string().trim().max(4000).default(""),
  theme: z.string().trim().max(120).default(""),
  dressCode: z.string().trim().max(200).default(""),
  colors: z.array(z.string().regex(HEX)).max(5).default([]),
  venueName: z.string().trim().max(160).default(""),
  venueAddress: z.string().trim().max(300).default(""),
  timezone: z.string().refine(isValidTimeZone, "Unknown time zone."),
  startsAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Pick a start date and time."),
  rsvpClosesAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Pick when RSVPs close."),
  playlistUrl: z.string().trim().max(500).default(""),
  giftBudget: z.string().trim().max(60).default(""),
  defaultPlusOnes: z.coerce.number().int().min(0).max(10).default(1),
});

export type EventInput = z.input<typeof eventInputSchema>;

function parseEventInput(input: EventInput) {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
  const v = parsed.data;
  const startsAt = zonedTimeToUtc(v.startsAtLocal, v.timezone);
  const rsvpClosesAt = zonedTimeToUtc(v.rsvpClosesAtLocal, v.timezone);
  if (rsvpClosesAt.getTime() > startsAt.getTime()) throw new AppError("RSVPs need to close before the party starts.");
  if (v.playlistUrl && !parsePlaylistUrl(v.playlistUrl)) throw new AppError("Playlist must be a web link.");
  return { ...v, startsAt: startsAt.toISOString(), rsvpClosesAt: rsvpClosesAt.toISOString() };
}

export const DEFAULT_TODOS: { title: string; section: "before_rsvp" | "before_party" | "day_of" }[] = [
  { title: "Book the venue", section: "before_rsvp" },
  { title: "Send invitations", section: "before_rsvp" },
  { title: "Run Secret Santa", section: "before_party" },
  { title: "Assign tables", section: "before_party" },
  { title: "Confirm the playlist", section: "before_party" },
  { title: "Pick raffle prizes", section: "before_party" },
  { title: "Set up check-in at the door", section: "day_of" },
];

export function createEvent(db: DB, hostUserId: string, input: EventInput): EventRecord {
  const v = parseEventInput(input);
  const id = newId();
  const created = nowIso();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO events (id, host_user_id, title, description, theme, dress_code, colors, venue_name, venue_address,
         timezone, starts_at, rsvp_closes_at, playlist_url, gift_budget, default_plus_ones, join_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      hostUserId,
      v.title,
      v.description,
      v.theme,
      v.dressCode,
      JSON.stringify(v.colors),
      v.venueName,
      v.venueAddress,
      v.timezone,
      v.startsAt,
      v.rsvpClosesAt,
      v.playlistUrl,
      v.giftBudget,
      v.defaultPlusOnes,
      urlToken(12),
      created,
    );
    db.prepare("INSERT INTO event_admins (event_id, user_id) VALUES (?, ?)").run(id, hostUserId);
    const insertTodo = db.prepare(
      "INSERT INTO todos (id, event_id, title, section, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    for (const t of DEFAULT_TODOS) insertTodo.run(newId(), id, t.title, t.section, created);
  })();
  return getEvent(db, id)!;
}

export function updateEvent(db: DB, eventId: string, input: EventInput): EventRecord {
  const v = parseEventInput(input);
  const before = getEvent(db, eventId);
  if (!before) throw new AppError("Event not found.");
  const addressChanged = before.venueAddress !== v.venueAddress || before.venueName !== v.venueName;
  db.prepare(
    `UPDATE events SET title = ?, description = ?, theme = ?, dress_code = ?, colors = ?, venue_name = ?, venue_address = ?,
       timezone = ?, starts_at = ?, rsvp_closes_at = ?, playlist_url = ?, gift_budget = ?, default_plus_ones = ?
       ${addressChanged ? ", latitude = NULL, longitude = NULL" : ""}
     WHERE id = ?`,
  ).run(
    v.title,
    v.description,
    v.theme,
    v.dressCode,
    JSON.stringify(v.colors),
    v.venueName,
    v.venueAddress,
    v.timezone,
    v.startsAt,
    v.rsvpClosesAt,
    v.playlistUrl,
    v.giftBudget,
    v.defaultPlusOnes,
    eventId,
  );
  if (addressChanged || before.startsAt !== v.startsAt) {
    db.prepare("DELETE FROM weather_cache WHERE event_id = ?").run(eventId);
  }
  return getEvent(db, eventId)!;
}

export function setCoordinates(db: DB, eventId: string, lat: number, lon: number, tempUnit: EventRecord["tempUnit"]): void {
  db.prepare("UPDATE events SET latitude = ?, longitude = ?, temp_unit = ? WHERE id = ?").run(lat, lon, tempUnit, eventId);
}

export function setCover(db: DB, eventId: string, coverPath: string | null): void {
  db.prepare("UPDATE events SET cover_path = ? WHERE id = ?").run(coverPath, eventId);
}

export function setCard(db: DB, eventId: string, style: string, message: string): void {
  if (!(CARD_STYLES as readonly string[]).includes(style)) throw new AppError("Unknown card style.");
  db.prepare("UPDATE events SET card_style = ?, card_message = ? WHERE id = ?").run(style, message.trim().slice(0, 400), eventId);
}

export function rotateJoinToken(db: DB, eventId: string): string {
  const token = urlToken(12);
  db.prepare("UPDATE events SET join_token = ? WHERE id = ?").run(token, eventId);
  return token;
}

export function getEvent(db: DB, eventId: string): EventRecord | null {
  const row = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId) as Record<string, unknown> | undefined;
  return row ? toEvent(row) : null;
}

export function getEventByJoinToken(db: DB, token: string): EventRecord | null {
  const row = db.prepare("SELECT * FROM events WHERE join_token = ?").get(token) as Record<string, unknown> | undefined;
  return row ? toEvent(row) : null;
}

export function isEventAdmin(db: DB, eventId: string, userId: string): boolean {
  return !!db.prepare("SELECT 1 FROM event_admins WHERE event_id = ? AND user_id = ?").get(eventId, userId);
}

export function addEventAdmin(db: DB, eventId: string, userId: string): void {
  db.prepare("INSERT OR IGNORE INTO event_admins (event_id, user_id) VALUES (?, ?)").run(eventId, userId);
}

export function removeEventAdmin(db: DB, eventId: string, userId: string): void {
  const event = getEvent(db, eventId);
  if (event?.hostUserId === userId) throw new AppError("The host can't be removed as an admin.");
  db.prepare("DELETE FROM event_admins WHERE event_id = ? AND user_id = ?").run(eventId, userId);
}

export function listAdminIds(db: DB, eventId: string): Set<string> {
  const rows = db.prepare("SELECT user_id FROM event_admins WHERE event_id = ?").all(eventId) as { user_id: string }[];
  return new Set(rows.map((r) => r.user_id));
}

export function inviteForUser(db: DB, eventId: string, userId: string): Invite | null {
  const row = db.prepare("SELECT * FROM invites WHERE event_id = ? AND user_id = ?").get(eventId, userId) as
    | Record<string, unknown>
    | undefined;
  return row ? toInvite(row) : null;
}

export type EventSummary = { event: EventRecord; role: "admin" | "guest"; status: Invite["status"] | null };

export function listEventsForUser(db: DB, userId: string): EventSummary[] {
  const rows = db
    .prepare(
      `SELECT e.*, (a.user_id IS NOT NULL) AS is_admin, i.status AS invite_status
       FROM events e
       LEFT JOIN event_admins a ON a.event_id = e.id AND a.user_id = ?
       LEFT JOIN invites i ON i.event_id = e.id AND i.user_id = ?
       WHERE a.user_id IS NOT NULL OR i.id IS NOT NULL
       ORDER BY e.starts_at`,
    )
    .all(userId, userId) as Record<string, unknown>[];
  return rows.map((r) => ({
    event: toEvent(r),
    role: r.is_admin ? "admin" : "guest",
    status: (r.invite_status ?? null) as Invite["status"] | null,
  }));
}

export function setLive(db: DB, eventId: string, live: boolean): void {
  if (live) db.prepare("UPDATE events SET live_started_at = COALESCE(live_started_at, ?), ended_at = NULL WHERE id = ?").run(nowIso(), eventId);
  else db.prepare("UPDATE events SET ended_at = ? WHERE id = ?").run(nowIso(), eventId);
}

export type EventPhase = "upcoming" | "live" | "ended";

export function eventPhase(event: Pick<EventRecord, "liveStartedAt" | "endedAt">): EventPhase {
  if (event.endedAt) return "ended";
  if (event.liveStartedAt) return "live";
  return "upcoming";
}
