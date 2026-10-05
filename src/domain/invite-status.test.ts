import { canTransition, receivesUpdates } from "./invite-status";

const open = { rsvpClosed: false };
const closed = { rsvpClosed: true };

describe("canTransition", () => {
  it("lets the host set any status", () => {
    expect(canTransition("host", "pending", "approved", open).ok).toBe(true);
    expect(canTransition("host", "confirmed", "pending", closed).ok).toBe(true);
    expect(canTransition("host", "not_going", "confirmed", closed).ok).toBe(true);
  });

  it("lets an approved guest answer Going or Not going while RSVPs are open", () => {
    expect(canTransition("guest", "approved", "confirmed", open).ok).toBe(true);
    expect(canTransition("guest", "approved", "not_going", open).ok).toBe(true);
    expect(canTransition("guest", "confirmed", "not_going", open).ok).toBe(true);
    expect(canTransition("guest", "not_going", "confirmed", open).ok).toBe(true);
  });

  it("blocks guests from approving themselves", () => {
    const r = canTransition("guest", "pending", "approved", open);
    expect(r.ok).toBe(false);
  });

  it("blocks pending guests from answering", () => {
    const r = canTransition("guest", "pending", "confirmed", open);
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/approved/) });
  });

  it("blocks guest changes after RSVPs close", () => {
    expect(canTransition("guest", "approved", "confirmed", closed).ok).toBe(false);
  });

  it("treats a no-op as allowed", () => {
    expect(canTransition("guest", "pending", "pending", closed).ok).toBe(true);
  });
});

describe("receivesUpdates", () => {
  it("is limited to approved and confirmed guests", () => {
    expect(receivesUpdates("approved")).toBe(true);
    expect(receivesUpdates("confirmed")).toBe(true);
    expect(receivesUpdates("pending")).toBe(false);
    expect(receivesUpdates("not_going")).toBe(false);
  });
});
