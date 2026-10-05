export const INVITE_STATUSES = ["pending", "approved", "confirmed", "not_going"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  confirmed: "Confirmed",
  not_going: "Not going",
};

export function isInviteStatus(value: unknown): value is InviteStatus {
  return typeof value === "string" && (INVITE_STATUSES as readonly string[]).includes(value);
}

export type StatusActor = "host" | "guest";

export type TransitionResult = { ok: true } | { ok: false; reason: string };

export function canTransition(
  actor: StatusActor,
  from: InviteStatus,
  to: InviteStatus,
  opts: { rsvpClosed: boolean },
): TransitionResult {
  if (from === to) return { ok: true };
  if (actor === "host") return { ok: true };

  if (to !== "confirmed" && to !== "not_going") {
    return { ok: false, reason: "Guests can only answer Going or Not going." };
  }
  if (from === "pending") {
    return { ok: false, reason: "Your host hasn't approved your invite yet." };
  }
  if (opts.rsvpClosed) {
    return { ok: false, reason: "RSVPs are closed. Ask the host to change your answer." };
  }
  return { ok: true };
}

/** Guests who receive host posts and can see the full event. */
export function receivesUpdates(status: InviteStatus): boolean {
  return status === "approved" || status === "confirmed";
}
