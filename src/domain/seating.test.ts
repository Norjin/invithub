import { autoAssign, canSeat, seatsUsed, type SeatingParty } from "./seating";

const closes = new Date("2026-12-10T00:00:00Z");
const after = { rsvpClosesAt: closes, now: new Date("2026-12-11T00:00:00Z") };
const before = { rsvpClosesAt: closes, now: new Date("2026-12-09T00:00:00Z") };

const party = (id: string, plusOnes = 0, status: SeatingParty["status"] = "confirmed", tableId: string | null = null): SeatingParty => ({
  inviteId: id,
  plusOnes,
  status,
  tableId,
});

describe("canSeat", () => {
  const table = { id: "t1", capacity: 4 };

  it("refuses before RSVPs close", () => {
    expect(canSeat(party("a"), table, [party("a")], before)).toEqual({ ok: false, reason: "Seating opens when RSVPs close." });
  });

  it("only seats confirmed guests", () => {
    for (const status of ["pending", "approved", "not_going"] as const) {
      expect(canSeat(party("a", 0, status), table, [], after).ok).toBe(false);
    }
  });

  it("keeps a party together and refuses to split it", () => {
    const parties = [party("x", 1, "confirmed", "t1"), party("a", 2)];
    // 2 used, 2 free, party of 3 needs 3.
    const r = canSeat(parties[1], table, parties, after);
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/needs 3 seats together/) });
  });

  it("fits a party that exactly fills the table", () => {
    const parties = [party("x", 0, "confirmed", "t1"), party("a", 2)];
    expect(canSeat(parties[1], table, parties, after).ok).toBe(true);
  });

  it("doesn't count the party's own current seats when re-seating at the same table", () => {
    const parties = [party("a", 3, "confirmed", "t1")];
    expect(canSeat(parties[0], table, parties, after).ok).toBe(true);
  });
});

describe("autoAssign", () => {
  it("places larger parties first and never overfills", () => {
    const tables = [
      { id: "t1", capacity: 4 },
      { id: "t2", capacity: 4 },
    ];
    const parties = [party("solo1"), party("trio", 2), party("pair", 1), party("solo2"), party("no", 0, "not_going")];
    const placements = autoAssign(tables, parties);
    const seated = parties.map((p) => ({ ...p, tableId: placements.get(p.inviteId) ?? p.tableId }));
    expect(placements.has("no")).toBe(false);
    expect(seatsUsed("t1", seated)).toBeLessThanOrEqual(4);
    expect(seatsUsed("t2", seated)).toBeLessThanOrEqual(4);
    expect(placements.size).toBe(4);
  });

  it("leaves a party unseated if no table can hold them together", () => {
    const placements = autoAssign([{ id: "t1", capacity: 2 }], [party("big", 3)]);
    expect(placements.size).toBe(0);
  });
});
