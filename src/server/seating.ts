import type { DB } from "./db";
import { newId } from "./ids";
import { toTable } from "./rows";
import { AppError, type Table } from "./types";
import { autoAssign, canSeat, isSeatingOpen, type SeatingParty } from "@/domain/seating";
import { getEvent } from "./events";

export function listTables(db: DB, eventId: string): Table[] {
  return (db.prepare("SELECT * FROM tables_ WHERE event_id = ? ORDER BY position").all(eventId) as Record<string, unknown>[]).map(
    toTable,
  );
}

export function addTable(db: DB, eventId: string, capacity: number, name?: string): Table {
  const cap = Math.floor(capacity);
  if (!(cap >= 1 && cap <= 40)) throw new AppError("Tables seat between 1 and 40 people.");
  const { n } = db.prepare("SELECT COALESCE(MAX(position), 0) AS n FROM tables_ WHERE event_id = ?").get(eventId) as { n: number };
  const id = newId();
  db.prepare("INSERT INTO tables_ (id, event_id, name, capacity, position) VALUES (?, ?, ?, ?, ?)").run(
    id,
    eventId,
    name?.trim() || `Table ${n + 1}`,
    cap,
    n + 1,
  );
  return toTable(db.prepare("SELECT * FROM tables_ WHERE id = ?").get(id) as Record<string, unknown>);
}

export function updateTable(db: DB, eventId: string, tableId: string, name: string, capacity: number): void {
  const cap = Math.floor(capacity);
  if (!(cap >= 1 && cap <= 40)) throw new AppError("Tables seat between 1 and 40 people.");
  if (!db.prepare("SELECT 1 FROM tables_ WHERE id = ? AND event_id = ?").get(tableId, eventId)) throw new AppError("Table not found.");
  const { used } = db
    .prepare(
      `SELECT COALESCE(SUM(1 + (SELECT COUNT(*) FROM plus_ones p WHERE p.invite_id = i.id)), 0) AS used
       FROM invites i WHERE i.table_id = ?`,
    )
    .get(tableId) as { used: number };
  if (cap < used) throw new AppError(`${used} people are already seated here.`);
  db.prepare("UPDATE tables_ SET name = ?, capacity = ? WHERE id = ?").run(name.trim() || "Table", cap, tableId);
}

export function removeTable(db: DB, eventId: string, tableId: string): void {
  db.prepare("DELETE FROM tables_ WHERE id = ? AND event_id = ?").run(tableId, eventId);
}

export function seatingParties(db: DB, eventId: string): SeatingParty[] {
  const rows = db
    .prepare(
      `SELECT i.id, i.status, i.table_id, (SELECT COUNT(*) FROM plus_ones p WHERE p.invite_id = i.id) AS plus_ones
       FROM invites i WHERE i.event_id = ?`,
    )
    .all(eventId) as { id: string; status: SeatingParty["status"]; table_id: string | null; plus_ones: number }[];
  return rows.map((r) => ({ inviteId: r.id, status: r.status, tableId: r.table_id, plusOnes: r.plus_ones }));
}

/** Runs in one transaction so two hosts seating at once can't overfill a table. */
export function seatParty(db: DB, eventId: string, inviteId: string, tableId: string | null, now = new Date()): void {
  db.transaction(() => {
    const event = getEvent(db, eventId);
    if (!event) throw new AppError("Event not found.");
    const parties = seatingParties(db, eventId);
    const party = parties.find((p) => p.inviteId === inviteId);
    if (!party) throw new AppError("Guest not found.");
    if (tableId === null) {
      db.prepare("UPDATE invites SET table_id = NULL WHERE id = ?").run(inviteId);
      return;
    }
    const table = listTables(db, eventId).find((t) => t.id === tableId);
    if (!table) throw new AppError("Table not found.");
    const check = canSeat(party, table, parties, { rsvpClosesAt: new Date(event.rsvpClosesAt), now });
    if (!check.ok) throw new AppError(check.reason);
    db.prepare("UPDATE invites SET table_id = ? WHERE id = ?").run(tableId, inviteId);
  }).immediate();
}

export function autoAssignSeats(db: DB, eventId: string, now = new Date()): number {
  return db.transaction(() => {
    const event = getEvent(db, eventId);
    if (!event) throw new AppError("Event not found.");
    if (!isSeatingOpen(new Date(event.rsvpClosesAt), now)) throw new AppError("Seating opens when RSVPs close.");
    const placements = autoAssign(listTables(db, eventId), seatingParties(db, eventId));
    const stmt = db.prepare("UPDATE invites SET table_id = ? WHERE id = ?");
    for (const [inviteId, tableId] of placements) stmt.run(tableId, inviteId);
    return placements.size;
  }).immediate();
}
