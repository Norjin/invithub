import { buildMessage, maskContact, normalizeContact } from "./notifications";

describe("normalizeContact", () => {
  it("lowercases emails and rejects bad ones", () => {
    expect(normalizeContact("email", "  Maya@Mail.COM ")).toEqual({ ok: true, value: "maya@mail.com" });
    expect(normalizeContact("email", "maya@").ok).toBe(false);
  });

  it("normalizes phone numbers to E.164", () => {
    expect(normalizeContact("phone", "(415) 555-0142")).toEqual({ ok: true, value: "+14155550142" });
    expect(normalizeContact("phone", "+44 20 7946 0958")).toEqual({ ok: true, value: "+442079460958" });
    expect(normalizeContact("phone", "555-01").ok).toBe(false);
  });
});

describe("buildMessage", () => {
  it("emails people who signed up with email", () => {
    const m = buildMessage({ contact: "maya@mail.com", channel: "email" }, { subject: "Hi", body: "Parking is free", link: "https://x/e/1" });
    expect(m).toEqual({ channel: "email", to: "maya@mail.com", subject: "Hi", body: "Parking is free\n\nhttps://x/e/1" });
  });

  it("texts people who signed up with a phone number and nothing else", () => {
    const m = buildMessage({ contact: "+14155550142", channel: "phone" }, { subject: "Hi", body: "Parking is free" });
    expect(m.channel).toBe("phone");
    expect(m.to).toBe("+14155550142");
    expect(m.body).toBe("Hi\nParking is free");
  });

  it("keeps texts short", () => {
    const m = buildMessage({ contact: "+14155550142", channel: "phone" }, { subject: "S", body: "x".repeat(2000) });
    expect(m.body.length).toBeLessThanOrEqual(600);
  });
});

describe("maskContact", () => {
  it("hides most of the contact", () => {
    expect(maskContact("maya@mail.com", "email")).toBe("m•••@mail.com");
    expect(maskContact("+14155550142", "phone")).toBe("•••• 0142");
  });
});
