import type { DB } from "./db";
import { newId, nowIso, shortCode } from "./ids";
import { attachPlusOnes, toInvite } from "./rows";
import { AppError, type EventRecord, type Invite, type InviteWithPlusOnes, type User } from "./types";
import { canTransition, isInviteStatus, type InviteStatus, type StatusActor } from "@/domain/invite-status";
import { normalizeContact, type ContactChannel } from "@/domain/notifications";
import { getEvent } from "./events";

function uniquePassCode(db: DB): string {
  for (;;) {
    const code = shortCode(6);
    if (!db.prepare("SELECT 1 FROM invites WHERE pass_code = ?").get(code)) return code;
  }
}

export function getInvite(db: DB, inviteId: string): Invite | null {
  const row = db.prepare("SELECT * FROM invites WHERE id = ?").get(inviteId) as Record<string, unknown> | undefined;
  return row ? toInvite(row) : null;
}

export function getInviteWithPlusOnes(db: DB, inviteId: string): InviteWithPlusOnes | null {
  const invite = getInvite(db, inviteId);
  return invite ? attachPlusOnes(db, [invite])[0] : null;
}

export function listInvites(db: DB, eventId: string): InviteWithPlusOnes[] {
  const rows = db
    .prepare("SELECT * FROM invites WHERE event_id = ? ORDER BY name COLLATE NOCASE")
    .all(eventId) as Record<string, unknown>[];
  return attachPlusOnes(db, rows.map(toInvite));
}

/** Scanning the party QR: returns the existing invite if this person already joined. */
export function joinEvent(db: DB, event: EventRecord, user: User): Invite {
  const existing = db
    .prepare("SELECT * FROM invites WHERE event_id = ? AND (user_id = ? OR contact = ?)")
    .get(event.id, user.id, user.contact) as Record<string, unknown> | undefined;
  if (existing) {
    const invite = toInvite(existing);
    if (!invite.userId) db.prepare("UPDATE invites SET user_id = ? WHERE id = ?").run(user.id, invite.id);
    return { ...invite, userId: user.id };
  }
  const isAdmin = !!db.prepare("SELECT 1 FROM event_admins WHERE event_id = ? AND user_id = ?").get(event.id, user.id);
  const id = newId();
  db.prepare(
    `INSERT INTO invites (id, event_id, user_id, name, contact, channel, status, plus_one_allowance, pass_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    event.id,
    user.id,
    user.name,
    user.contact,
    user.channel,
    isAdmin ? "confirmed" : "pending",
    event.defaultPlusOnes,
    uniquePassCode(db),
    nowIso(),
  );
  return getInvite(db, id)!;
}

export type NewGuest = { name: string; channel: ContactChannel; contact: string; plusOneAllowance?: number; status?: InviteStatus };

export function addGuest(db: DB, eventId: string, guest: NewGuest): Invite {
  const event = getEvent(db, eventId);
  if (!event) throw new AppError("Event not found.");
  const name = guest.name.trim();
  if (!name) throw new AppError("Add the guest's name.");
  const normalized = normalizeContact(guest.channel, guest.contact);
  if (!normalized.ok) throw new AppError(normalized.reason);
  if (db.prepare("SELECT 1 FROM invites WHERE event_id = ? AND contact = ?").get(eventId, normalized.value)) {
    throw new AppError("That guest is already on the list.");
  }
  const user = db.prepare("SELECT id FROM users WHERE contact = ?").get(normalized.value) as { id: string } | undefined;
  const id = newId();
  db.prepare(
    `INSERT INTO invites (id, event_id, user_id, name, contact, channel, status, plus_one_allowance, pass_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    eventId,
    user?.id ?? null,
    name.slice(0, 80),
    normalized.value,
    guest.channel,
    guest.status ?? "approved",
    Math.max(0, Math.min(10, guest.plusOneAllowance ?? event.defaultPlusOnes)),
    uniquePassCode(db),
    nowIso(),
  );
  return getInvite(db, id)!;
}

export function removeGuest(db: DB, inviteId: string): void {
  db.prepare("DELETE FROM invites WHERE id = ?").run(inviteId);
}

function rsvpClosed(event: EventRecord, now: Date) {
  return now.getTime() >= new Date(event.rsvpClosesAt).getTime();
}

export function setInviteStatus(
  db: DB,
  inviteId: string,
  to: string,
  actor: StatusActor,
  now = new Date(),
): Invite {
  if (!isInviteStatus(to)) throw new AppError("Unknown status.");
  const invite = getInvite(db, inviteId);
  if (!invite) throw new AppError("Guest not found.");
  const event = getEvent(db, invite.eventId)!;
  const check = canTransition(actor, invite.status, to, { rsvpClosed: rsvpClosed(event, now) });
  if (!check.ok) throw new AppError(check.reason);
  // Leaving Confirmed frees the party's seats.
  const clearSeat = to !== "confirmed" ? ", table_id = NULL" : "";
  db.prepare(`UPDATE invites SET status = ?${clearSeat} WHERE id = ?`).run(to, inviteId);
  return getInvite(db, inviteId)!;
}

export function setPlusOneAllowance(db: DB, inviteId: string, allowance: number): void {
  const invite = getInviteWithPlusOnes(db, inviteId);
  if (!invite) throw new AppError("Guest not found.");
  const n = Math.max(0, Math.min(10, Math.floor(allowance)));
  if (invite.plusOnes.length > n) throw new AppError(`${invite.name} already added ${invite.plusOnes.length} plus-ones.`);
  db.prepare("UPDATE invites SET plus_one_allowance = ? WHERE id = ?").run(n, inviteId);
}

/** Replaces the guest's plus-one list; names that stay keep their check-in. */
export function setPlusOnes(db: DB, inviteId: string, names: string[], actor: StatusActor, now = new Date()): InviteWithPlusOnes {
  const invite = getInviteWithPlusOnes(db, inviteId);
  if (!invite) throw new AppError("Guest not found.");
  const event = getEvent(db, invite.eventId)!;
  if (actor === "guest") {
    if (invite.status === "pending") throw new AppError("You can add guests once your invite is approved.");
    if (rsvpClosed(event, now)) throw new AppError("RSVPs are closed. Ask the host to change your plus-ones.");
  }
  const clean = names.map((n) => n.trim().slice(0, 80)).filter(Boolean);
  if (clean.length > invite.plusOneAllowance) {
    throw new AppError(
      invite.plusOneAllowance === 0
        ? "This invite doesn't include plus-ones."
        : `You can bring up to ${invite.plusOneAllowance} ${invite.plusOneAllowance === 1 ? "guest" : "guests"}.`,
    );
  }
  if (invite.tableId && clean.length > invite.plusOnes.length) {
    const table = db.prepare("SELECT capacity FROM tables_ WHERE id = ?").get(invite.tableId) as { capacity: number };
    const used = db
      .prepare(
        `SELECT COALESCE(SUM(1 + (SELECT COUNT(*) FROM plus_ones p WHERE p.invite_id = i.id)), 0) AS n
         FROM invites i WHERE i.table_id = ? AND i.id != ?`,
      )
      .get(invite.tableId, inviteId) as { n: number };
    if (used.n + 1 + clean.length > table.capacity) {
      throw new AppError("Your table doesn't have room for another guest. Ask the host to move your party.");
    }
  }
  db.transaction(() => {
    const keep = new Set<string>();
    for (const name of clean) {
      const match = invite.plusOnes.find((p) => p.name === name && !keep.has(p.id));
      if (match) keep.add(match.id);
      else {
        const id = newId();
        db.prepare("INSERT INTO plus_ones (id, invite_id, name, created_at) VALUES (?, ?, ?, ?)").run(id, inviteId, name, nowIso());
        keep.add(id);
      }
    }
    for (const p of invite.plusOnes) {
      if (!keep.has(p.id)) db.prepare("DELETE FROM plus_ones WHERE id = ?").run(p.id);
    }
  })();
  return getInviteWithPlusOnes(db, inviteId)!;
}

export type CheckInResult =
  | { ok: true; invite: InviteWithPlusOnes; alreadyCheckedIn: boolean }
  | { ok: false; reason: string };

/** The pass QR belongs to one invite; checking it in also checks in that party's plus-ones. */
export function checkInByPassCode(db: DB, eventId: string, rawCode: string): CheckInResult {
  const code = rawCode.trim().toUpperCase();
  const row = db.prepare("SELECT * FROM invites WHERE event_id = ? AND pass_code = ?").get(eventId, code) as
    | Record<string, unknown>
    | undefined;
  if (!row) return { ok: false, reason: "No pass with that code for this event." };
  const invite = toInvite(row);
  if (invite.status !== "confirmed") {
    return { ok: false, reason: `${invite.name} isn't confirmed (status: ${invite.status.replace("_", " ")}).` };
  }
  const already = !!invite.checkedInAt;
  if (!already) {
    const at = nowIso();
    db.transaction(() => {
      db.prepare("UPDATE invites SET checked_in_at = ? WHERE id = ?").run(at, invite.id);
      db.prepare("UPDATE plus_ones SET checked_in_at = COALESCE(checked_in_at, ?) WHERE invite_id = ?").run(at, invite.id);
    })();
  }
  return { ok: true, invite: getInviteWithPlusOnes(db, invite.id)!, alreadyCheckedIn: already };
}

export function undoCheckIn(db: DB, inviteId: string): void {
  db.transaction(() => {
    db.prepare("UPDATE invites SET checked_in_at = NULL WHERE id = ?").run(inviteId);
    db.prepare("UPDATE plus_ones SET checked_in_at = NULL WHERE invite_id = ?").run(inviteId);
  })();
}

export function markInviteSent(db: DB, inviteIds: string[]): void {
  const stmt = db.prepare("UPDATE invites SET invite_sent_at = ? WHERE id = ?");
  const at = nowIso();
  db.transaction(() => inviteIds.forEach((id) => stmt.run(at, id)))();
}
