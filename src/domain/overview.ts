import type { InviteStatus } from "./invite-status";

export type OverviewInvite = {
  status: InviteStatus;
  plusOnes: number;
  checkedIn: boolean;
  plusOnesCheckedIn: number;
  seated: boolean;
};

export type OverviewCounts = {
  invited: number;
  pending: number;
  approved: number;
  confirmed: number;
  notGoing: number;
  attending: number;
  attendingPlusOnes: number;
  checkedIn: number;
  seated: number;
};

/** Attending and checked-in count people, so plus-ones are included; the status counts are per invite. */
export function computeOverview(invites: readonly OverviewInvite[]): OverviewCounts {
  const counts: OverviewCounts = {
    invited: invites.length,
    pending: 0,
    approved: 0,
    confirmed: 0,
    notGoing: 0,
    attending: 0,
    attendingPlusOnes: 0,
    checkedIn: 0,
    seated: 0,
  };
  for (const inv of invites) {
    if (inv.status === "pending") counts.pending++;
    if (inv.status === "approved") counts.approved++;
    if (inv.status === "not_going") counts.notGoing++;
    if (inv.status === "confirmed") {
      counts.confirmed++;
      counts.attending += 1 + inv.plusOnes;
      counts.attendingPlusOnes += inv.plusOnes;
      if (inv.seated) counts.seated += 1 + inv.plusOnes;
    }
    if (inv.checkedIn) counts.checkedIn++;
    counts.checkedIn += inv.plusOnesCheckedIn;
  }
  return counts;
}
