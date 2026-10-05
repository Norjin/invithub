import type { DB } from "./db";
import { computeOverview, type OverviewCounts } from "@/domain/overview";
import { listInvites } from "./invites";

export function getOverview(db: DB, eventId: string): OverviewCounts {
  return computeOverview(
    listInvites(db, eventId).map((i) => ({
      status: i.status,
      plusOnes: i.plusOnes.length,
      checkedIn: !!i.checkedInAt,
      plusOnesCheckedIn: i.plusOnes.filter((p) => p.checkedInAt).length,
      seated: !!i.tableId,
    })),
  );
}
