import type { DB } from "./db";
import { nowIso } from "./ids";
import { AppError } from "./types";
import { canDrawSecretSanta, drawSecretSanta } from "@/domain/secret-santa";
import type { RandomInt } from "@/domain/random";
import { getEvent } from "./events";

/** Draws among confirmed guests (not their plus-ones). Running it again before the party replaces the old draw. */
export function runSecretSanta(db: DB, eventId: string, now = new Date(), rand?: RandomInt): number {
  return db.transaction(() => {
    const event = getEvent(db, eventId);
    if (!event) throw new AppError("Event not found.");
    if (!canDrawSecretSanta(new Date(event.startsAt), now)) throw new AppError("Secret Santa has to be drawn before the party starts.");
    const ids = (db.prepare("SELECT id FROM invites WHERE event_id = ? AND status = 'confirmed'").all(eventId) as { id: string }[]).map(
      (r) => r.id,
    );
    const result = drawSecretSanta(ids, rand);
    if (!result.ok) throw new AppError(result.reason);
    db.prepare("DELETE FROM santa_pairs WHERE event_id = ?").run(eventId);
    const stmt = db.prepare("INSERT INTO santa_pairs (event_id, giver_invite_id, receiver_invite_id) VALUES (?, ?, ?)");
    for (const p of result.pairs) stmt.run(eventId, p.giver, p.receiver);
    db.prepare("UPDATE events SET santa_drawn_at = ? WHERE id = ?").run(nowIso(), eventId);
    return result.pairs.length;
  })();
}

export function santaRecipientFor(db: DB, eventId: string, giverInviteId: string): { name: string } | null {
  const row = db
    .prepare(
      `SELECT i.name FROM santa_pairs s JOIN invites i ON i.id = s.receiver_invite_id
       WHERE s.event_id = ? AND s.giver_invite_id = ?`,
    )
    .get(eventId, giverInviteId) as { name: string } | undefined;
  return row ?? null;
}

export function santaParticipantCount(db: DB, eventId: string): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM santa_pairs WHERE event_id = ?").get(eventId) as { n: number }).n;
}

/** Confirmed guests who were added or confirmed after the draw and have nobody to buy for. */
export function santaUnassignedCount(db: DB, eventId: string): number {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM invites i WHERE i.event_id = ? AND i.status = 'confirmed'
         AND NOT EXISTS (SELECT 1 FROM santa_pairs s WHERE s.event_id = i.event_id AND s.giver_invite_id = i.id)`,
      )
      .get(eventId) as { n: number }
  ).n;
}
