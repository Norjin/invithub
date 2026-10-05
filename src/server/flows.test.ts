import { makeEvent, makeGuest, makeUser, seededRandom, testDb } from "./test-utils";
import { requestLoginCode, userForSession, verifyLoginCode } from "./auth-core";
import { getEventByJoinToken, inviteForUser, setLive } from "./events";
import { addGuest, checkInByPassCode, getInvite, joinEvent, listInvites, setInviteStatus, setPlusOnes } from "./invites";
import { addTable, autoAssignSeats, seatParty, listTables } from "./seating";
import { createPost } from "./posts";
import { deliver, listOutbox } from "./notify";
import { runSecretSanta, santaRecipientFor, santaUnassignedCount } from "./santa";
import { askQuestion, drawRaffle, listQuestions, toggleVote, voidDraw } from "./live";
import { getOverview } from "./overview";
import { listTodos } from "./todos";
import { AppError } from "./types";

const DAY = 86_400_000;

describe("sign in with a one-time code", () => {
  it("uses the name the host gave an invited guest", () => {
    const db = testDb();
    const event = makeEvent(db, makeUser(db));
    addGuest(db, event.id, { name: "Priya Patel", channel: "email", contact: "priya@example.com" });
    const { contact, code } = requestLoginCode(db, { channel: "email", contact: "priya@example.com" });
    expect(verifyLoginCode(db, contact, code).user.name).toBe("Priya Patel");
  });

  it("creates the account on first sign-in, links invites added by contact, and opens a session", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    addGuest(db, event.id, { name: "Maya Chen", channel: "email", contact: "maya@mail.com" });

    const { code, contact } = requestLoginCode(db, { channel: "email", contact: "Maya@Mail.com", name: "Maya Chen" });
    expect(contact).toBe("maya@mail.com");
    expect(() => verifyLoginCode(db, contact, "000000" === code ? "111111" : "000000")).toThrow(AppError);

    const { user, sessionToken } = verifyLoginCode(db, contact, code);
    expect(user.name).toBe("Maya Chen");
    expect(userForSession(db, sessionToken)?.id).toBe(user.id);
    expect(inviteForUser(db, event.id, user.id)?.status).toBe("approved");

    // Codes are single-use.
    expect(() => verifyLoginCode(db, contact, code)).toThrow(/expired/);
  });

  it("requires a name for new accounts and locks after five wrong tries", () => {
    const db = testDb();
    expect(() => requestLoginCode(db, { channel: "phone", contact: "(415) 555-0142" })).toThrow(/name/);
    const { contact, code } = requestLoginCode(db, { channel: "phone", contact: "(415) 555-0142", name: "Daniel" });
    const wrong = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) expect(() => verifyLoginCode(db, contact, wrong)).toThrow();
    expect(() => verifyLoginCode(db, contact, code)).toThrow(/Too many attempts/);
  });
});

describe("joining from the party QR", () => {
  it("lands new guests on Pending and returns the same invite on a second scan", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    const guest = makeUser(db, "Sofia");
    const found = getEventByJoinToken(db, event.joinToken)!;
    const first = joinEvent(db, found, guest);
    const second = joinEvent(db, found, guest);
    expect(first.status).toBe("pending");
    expect(second.id).toBe(first.id);
    expect(listInvites(db, event.id)).toHaveLength(1);
  });

  it("lets the host approve, then the guest confirm with a plus-one", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    const invite = joinEvent(db, event, makeUser(db, "Daniel"));
    expect(() => setInviteStatus(db, invite.id, "confirmed", "guest")).toThrow(/approved/);
    setInviteStatus(db, invite.id, "approved", "host");
    setInviteStatus(db, invite.id, "confirmed", "guest");
    const withPlusOne = setPlusOnes(db, invite.id, ["Sarah Kim"], "guest");
    expect(withPlusOne.plusOnes.map((p) => p.name)).toEqual(["Sarah Kim"]);
    expect(() => setPlusOnes(db, invite.id, ["A", "B"], "guest")).toThrow(/up to 1/);
  });

  it("freezes guest RSVP changes once RSVPs close", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    const invite = makeGuest(db, event, "Ava", { status: "approved" });
    const afterClose = new Date(new Date(event.rsvpClosesAt).getTime() + 1000);
    expect(() => setInviteStatus(db, invite.id, "confirmed", "guest", afterClose)).toThrow(/closed/);
    expect(setInviteStatus(db, invite.id, "confirmed", "host", afterClose).status).toBe("confirmed");
  });
});

describe("seating", () => {
  it("is locked until RSVPs close, then keeps parties together", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    const table = addTable(db, event.id, 3);
    const trio = makeGuest(db, event, "Trio", { status: "confirmed", plusOnes: ["P1", "P2"] });
    const solo = makeGuest(db, event, "Solo", { status: "confirmed" });
    const beforeClose = new Date(new Date(event.rsvpClosesAt).getTime() - 1000);
    const afterClose = new Date(new Date(event.rsvpClosesAt).getTime() + 1000);

    expect(() => seatParty(db, event.id, trio.id, table.id, beforeClose)).toThrow(/RSVPs close/);
    seatParty(db, event.id, trio.id, table.id, afterClose);
    expect(() => seatParty(db, event.id, solo.id, table.id, afterClose)).toThrow(/full/);
  });

  it("frees a party's seats when they stop attending", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host, { startsAt: new Date(Date.now() + 2 * DAY), rsvpClosesAt: new Date(Date.now() - DAY) });
    const table = addTable(db, event.id, 4);
    const g = makeGuest(db, event, "Liam", { status: "confirmed" });
    seatParty(db, event.id, g.id, table.id);
    setInviteStatus(db, g.id, "not_going", "host");
    expect(getInvite(db, g.id)!.tableId).toBeNull();
  });

  it("auto-assigns only confirmed guests and leaves tables within capacity", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host, { startsAt: new Date(Date.now() + 2 * DAY), rsvpClosesAt: new Date(Date.now() - DAY) });
    addTable(db, event.id, 4);
    addTable(db, event.id, 4);
    makeGuest(db, event, "A", { status: "confirmed", plusOnes: ["A+1"] });
    makeGuest(db, event, "B", { status: "confirmed", plusOnes: ["B+1", "B+2"] });
    makeGuest(db, event, "C", { status: "confirmed" });
    makeGuest(db, event, "D", { status: "pending" });
    expect(autoAssignSeats(db, event.id)).toBe(3);
    const counts = getOverview(db, event.id);
    expect(counts.seated).toBe(6);
    expect(listTables(db, event.id)).toHaveLength(2);
  });
});

describe("host posts", () => {
  it("notify approved and confirmed guests once each, on the channel they signed up with", async () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    makeGuest(db, event, "Email Guest", { status: "approved" });
    makeGuest(db, event, "Phone Guest", { status: "confirmed", channel: "phone" });
    makeGuest(db, event, "Pending Guest", { status: "pending" });
    makeGuest(db, event, "Declined Guest", { status: "not_going" });

    const { notificationIds } = createPost(db, event.id, host.id, "Parking is free after 6 PM");
    expect(notificationIds).toHaveLength(2);
    const results = await deliver(db, notificationIds);
    expect(results.every((r) => r.status === "sent" && r.provider === "outbox")).toBe(true);
    const channels = listOutbox(db)
      .filter((n) => n.kind === "post")
      .map((n) => n.channel)
      .sort();
    expect(channels).toEqual(["email", "phone"]);
  });

  it("records failures from a provider instead of throwing", async () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    makeGuest(db, event, "G", { status: "approved" });
    const { notificationIds } = createPost(db, event.id, host.id, "Hello");
    const failing = () => ({ name: "test", send: async () => Promise.reject(new Error("boom")) });
    const [r] = await deliver(db, notificationIds, failing);
    expect(r).toEqual({ status: "failed", provider: "test", error: "boom" });
  });
});

describe("Secret Santa", () => {
  it("assigns every confirmed guest one recipient who isn't themselves, before the party only", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    const guests = ["A", "B", "C", "D"].map((n) => makeGuest(db, event, n, { status: "confirmed" }));
    makeGuest(db, event, "Not coming", { status: "not_going" });

    expect(runSecretSanta(db, event.id, new Date(), seededRandom(7))).toBe(4);
    const receivers = guests.map((g) => santaRecipientFor(db, event.id, g.id)!.name);
    expect(new Set(receivers).size).toBe(4);
    guests.forEach((g, i) => expect(receivers[i]).not.toBe(g.name));

    makeGuest(db, event, "Late", { status: "confirmed" });
    expect(santaUnassignedCount(db, event.id)).toBe(1);

    const afterStart = new Date(new Date(event.startsAt).getTime() + 1000);
    expect(() => runSecretSanta(db, event.id, afterStart)).toThrow(/before the party/);
  });

  it("refuses with fewer than two confirmed guests", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    makeGuest(db, event, "Only", { status: "confirmed" });
    expect(() => runSecretSanta(db, event.id)).toThrow(/at least two/);
  });
});

describe("live event", () => {
  it("checks in by pass code, then draws raffle winners only from checked-in guests", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    const here = makeGuest(db, event, "Here", { status: "confirmed", plusOnes: ["Friend"] });
    makeGuest(db, event, "Away", { status: "confirmed" });
    const pending = makeGuest(db, event, "Pending", { status: "pending" });

    expect(() => drawRaffle(db, event.id)).toThrow(/goes live/);
    setLive(db, event.id, true);
    expect(() => drawRaffle(db, event.id)).toThrow(/Nobody has checked in/);

    expect(checkInByPassCode(db, event.id, pending.passCode).ok).toBe(false);
    const res = checkInByPassCode(db, event.id, here.passCode.toLowerCase());
    expect(res.ok && res.invite.plusOnes[0].checkedInAt).toBeTruthy();
    const again = checkInByPassCode(db, event.id, here.passCode);
    expect(again.ok && again.alreadyCheckedIn).toBe(true);
    expect(getOverview(db, event.id).checkedIn).toBe(2);

    const draw = drawRaffle(db, event.id, seededRandom(3));
    expect(draw.inviteId).toBe(here.id);
    expect(draw.poolSize).toBe(1);
    expect(() => drawRaffle(db, event.id)).toThrow(/already won/);
    voidDraw(db, event.id, draw.id);
    expect(drawRaffle(db, event.id).inviteId).toBe(here.id);
  });

  it("accepts one vote per person per question and only while live", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    const guest = makeUser(db, "Guest");
    expect(() => askQuestion(db, event.id, guest.id, "How did you meet?")).toThrow(/live/);
    setLive(db, event.id, true);
    const q1 = askQuestion(db, event.id, guest.id, "How did you meet?");
    const q2 = askQuestion(db, event.id, guest.id, "Who picked the playlist?");
    expect(toggleVote(db, event.id, q2, guest.id)).toBe(true);
    expect(toggleVote(db, event.id, q2, host.id)).toBe(true);
    expect(toggleVote(db, event.id, q1, guest.id)).toBe(true);
    expect(toggleVote(db, event.id, q1, guest.id)).toBe(false);
    const top = listQuestions(db, event.id, guest.id, "top");
    expect(top.map((q) => [q.body, q.votes])).toEqual([
      ["Who picked the playlist?", 2],
      ["How did you meet?", 0],
    ]);
    expect(top[0].votedByMe).toBe(true);
    setLive(db, event.id, false);
    expect(() => toggleVote(db, event.id, q1, guest.id)).toThrow(/live/);
  });
});

describe("new events", () => {
  it("start with the host as admin and a default prep list", () => {
    const db = testDb();
    const host = makeUser(db);
    const event = makeEvent(db, host);
    expect(listTodos(db, event.id).map((t) => t.title)).toContain("Run Secret Santa");
  });

  it("reject RSVP deadlines after the start time", () => {
    const db = testDb();
    const host = makeUser(db);
    expect(() =>
      makeEvent(db, host, { startsAt: new Date(Date.now() + DAY), rsvpClosesAt: new Date(Date.now() + 2 * DAY) }),
    ).toThrow(/close before/);
  });
});
