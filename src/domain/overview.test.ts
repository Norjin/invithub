import { computeOverview } from "./overview";

describe("computeOverview", () => {
  it("counts invites by status and people for attending and check-in", () => {
    const counts = computeOverview([
      { status: "confirmed", plusOnes: 1, checkedIn: true, plusOnesCheckedIn: 1, seated: true },
      { status: "confirmed", plusOnes: 0, checkedIn: false, plusOnesCheckedIn: 0, seated: false },
      { status: "approved", plusOnes: 0, checkedIn: false, plusOnesCheckedIn: 0, seated: false },
      { status: "pending", plusOnes: 0, checkedIn: false, plusOnesCheckedIn: 0, seated: false },
      { status: "not_going", plusOnes: 2, checkedIn: false, plusOnesCheckedIn: 0, seated: false },
    ]);
    expect(counts).toEqual({
      invited: 5,
      pending: 1,
      approved: 1,
      confirmed: 2,
      notGoing: 1,
      attending: 3,
      attendingPlusOnes: 1,
      checkedIn: 2,
      seated: 2,
    });
  });
});
