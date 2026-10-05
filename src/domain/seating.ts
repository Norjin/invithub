import type { InviteStatus } from "./invite-status";

export type SeatingTable = { id: string; capacity: number };
export type SeatingParty = {
  inviteId: string;
  status: InviteStatus;
  plusOnes: number;
  tableId: string | null;
};

export type SeatingCheck = { ok: true } | { ok: false; reason: string };

export function partySize(party: Pick<SeatingParty, "plusOnes">): number {
  return 1 + party.plusOnes;
}

export function seatsUsed(tableId: string, parties: SeatingParty[], excludeInviteId?: string): number {
  return parties
    .filter((p) => p.tableId === tableId && p.inviteId !== excludeInviteId)
    .reduce((sum, p) => sum + partySize(p), 0);
}

export function isSeatingOpen(rsvpClosesAt: Date, now: Date): boolean {
  return now.getTime() >= rsvpClosesAt.getTime();
}

/** A party sits together: the invitee and every plus-one go to the same table. */
export function canSeat(
  party: SeatingParty,
  table: SeatingTable,
  parties: SeatingParty[],
  opts: { rsvpClosesAt: Date; now: Date },
): SeatingCheck {
  if (!isSeatingOpen(opts.rsvpClosesAt, opts.now)) {
    return { ok: false, reason: "Seating opens when RSVPs close." };
  }
  if (party.status !== "confirmed") {
    return { ok: false, reason: "Only confirmed guests can be seated." };
  }
  const free = table.capacity - seatsUsed(table.id, parties, party.inviteId);
  const needed = partySize(party);
  if (needed > free) {
    return {
      ok: false,
      reason:
        party.plusOnes > 0
          ? `This party needs ${needed} seats together and the table has ${Math.max(free, 0)} free.`
          : "This table is full.",
    };
  }
  return { ok: true };
}

/**
 * Fills tables with unseated confirmed parties, largest parties first so
 * groups stay together. Returns inviteId -> tableId for parties it placed.
 */
export function autoAssign(tables: SeatingTable[], parties: SeatingParty[]): Map<string, string> {
  const used = new Map<string, number>();
  for (const t of tables) used.set(t.id, seatsUsed(t.id, parties));

  const placements = new Map<string, string>();
  const waiting = parties
    .filter((p) => p.status === "confirmed" && p.tableId === null)
    .sort((a, b) => partySize(b) - partySize(a));

  for (const party of waiting) {
    const needed = partySize(party);
    const target = tables
      .filter((t) => t.capacity - (used.get(t.id) ?? 0) >= needed)
      .sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0))[0];
    if (!target) continue;
    placements.set(party.inviteId, target.id);
    used.set(target.id, (used.get(target.id) ?? 0) + needed);
  }
  return placements;
}
