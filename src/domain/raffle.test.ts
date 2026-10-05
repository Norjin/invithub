import { drawRaffleWinner } from "./raffle";
import { seededRandom } from "@/server/test-utils";

describe("drawRaffleWinner", () => {
  it("returns null for an empty pool", () => {
    expect(drawRaffleWinner([], new Set())).toBeNull();
    expect(drawRaffleWinner([{ inviteId: "a", checkedIn: false }], new Set())).toBeNull();
  });

  it("only picks people who checked in", () => {
    const entrants = [
      { inviteId: "here", checkedIn: true },
      { inviteId: "away1", checkedIn: false },
      { inviteId: "away2", checkedIn: false },
    ];
    for (let seed = 1; seed < 30; seed++) {
      expect(drawRaffleWinner(entrants, new Set(), seededRandom(seed))).toBe("here");
    }
  });

  it("skips previous winners", () => {
    const entrants = [
      { inviteId: "a", checkedIn: true },
      { inviteId: "b", checkedIn: true },
    ];
    expect(drawRaffleWinner(entrants, new Set(["a"]))).toBe("b");
    expect(drawRaffleWinner(entrants, new Set(["a", "b"]))).toBeNull();
  });
});
