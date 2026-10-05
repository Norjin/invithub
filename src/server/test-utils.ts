import { openDb, type DB } from "./db";
import { newId, nowIso } from "./ids";
import { createEvent, type EventInput } from "./events";
import { addGuest, setInviteStatus, setPlusOnes } from "./invites";
import type { EventRecord, Invite, User } from "./types";

export function testDb(): DB {
  return openDb(":memory:");
}

let counter = 0;
export function makeUser(db: DB, name = "Host", channel: User["channel"] = "email"): User {
  counter++;
  const contact = channel === "email" ? `user${counter}@example.com` : `+1415555${String(1000 + counter).slice(-4)}`;
  const id = newId();
  db.prepare("INSERT INTO users (id, name, contact, channel, created_at) VALUES (?, ?, ?, ?, ?)").run(id, name, contact, channel, nowIso());
  return { id, name, contact, channel };
}

const toLocal = (d: Date) => d.toISOString().slice(0, 16);

/** Times are in UTC so tests don't depend on the machine's zone. */
export function makeEvent(db: DB, host: User, opts: { startsAt?: Date; rsvpClosesAt?: Date } & Partial<EventInput> = {}): EventRecord {
  const startsAt = opts.startsAt ?? new Date(Date.now() + 10 * 86_400_000);
  const rsvpClosesAt = opts.rsvpClosesAt ?? new Date(startsAt.getTime() - 3 * 86_400_000);
  return createEvent(db, host.id, {
    title: "Winter Glow Party",
    timezone: "UTC",
    ...opts,
    startsAtLocal: toLocal(startsAt),
    rsvpClosesAtLocal: toLocal(rsvpClosesAt),
  });
}

export function makeGuest(
  db: DB,
  event: EventRecord,
  name: string,
  opts: { status?: Invite["status"]; plusOnes?: string[]; channel?: User["channel"] } = {},
): Invite {
  counter++;
  const channel = opts.channel ?? "email";
  const contact = channel === "email" ? `${name.toLowerCase().replace(/\W/g, "")}${counter}@example.com` : `+1628555${String(1000 + counter).slice(-4)}`;
  const invite = addGuest(db, event.id, { name, channel, contact, plusOneAllowance: Math.max(opts.plusOnes?.length ?? 0, 1) });
  if (opts.plusOnes?.length) setPlusOnes(db, invite.id, opts.plusOnes, "host");
  if (opts.status && opts.status !== invite.status) return setInviteStatus(db, invite.id, opts.status, "host");
  return invite;
}

/** Deterministic stand-in for crypto randomness. */
export function seededRandom(seed = 42) {
  let s = seed;
  return (max: number) => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s % max;
  };
}
